import {Request, Response} from 'express'
import { db } from '../lib/firebaseAdmin.js';
import openai from '../configs/openai.js';
import { FieldValue } from 'firebase-admin/firestore';

// Helper function for AI calls with retry and fallback
const callAIWithRetry = async (payload: any, customModels: string[] = []) => {
    const models = customModels.length > 0 ? customModels : [
        'nvidia/nemotron-3-super-120b-a12b:free',
        'liquid/lfm-2.5-1.2b-instruct:free',
        'google/gemma-3-12b-it:free'
    ];

    let lastError: any = null;

    for (const model of models) {
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
            try {
                console.log(`Attempting AI call with model: ${model} (Retry: ${retries})`);
                const response = await openai.chat.completions.create({
                    ...payload,
                    model: model
                });
                return response;
            } catch (error: any) {
                lastError = error;
                console.error(`AI call failed with ${model}: ${error.message}`);
                
                if (error.status === 429) {
                    retries++;
                    const waitTime = Math.pow(2, retries) * 1000;
                    console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                break;
            }
        }
    }
    throw lastError || new Error("All AI models failed");
};

// Controller Function to Make Revision
export const makeRevision = async (req: Request, res: Response) => {
    const userId = req.userId;

    try {
        const {projectId} = req.params;
        const {message} = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if(!userDoc.exists){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userData = userDoc.data();

        if(userData && userData.credits < 5){
            return res.status(403).json({ message: 'add more credits to make changes' });
        }

        if(!message || message.trim() === ''){
            return res.status(400).json({ message: 'Please enter a valid prompt' });
        }

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if(!projectDoc.exists || projectDoc.data()?.userId !== userId){
            return res.status(404).json({ message: 'Project not found' });
        }

        const currentProject = projectDoc.data();

        await db.collection('conversations').add({
            role: 'user',
            content: message,
            projectId,
            timestamp: FieldValue.serverTimestamp()
        });

        await projectRef.update({
            status: 'revising',
            updatedAt: FieldValue.serverTimestamp()
        })

        await userRef.update({
            credits: FieldValue.increment(-5)
        });

        // Enhance user prompt
        await db.collection('conversations').add({
            role: 'assistant',
            content: "Step 1/2: Analyzing your requested change...",
            projectId,
            timestamp: FieldValue.serverTimestamp()
        })

        const promptEnhanceResponse = await callAIWithRetry({
            messages: [
                {
                    role: 'system',
                     content: `
                     You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                    Enhance this by:
                    1. Being specific about what elements to change
                    2. Mentioning design details (colors, spacing, sizes)
                    3. Clarifying the desired outcome
                    4. Using clear technical terms

                    Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).`
                },
                {
                    role: 'user',
                    content: `User's request: "${message}"`
                }
            ]
        }, ['liquid/lfm-2.5-1.2b-instruct:free', 'nvidia/nemotron-3-super-120b-a12b:free']);

        const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;

        await db.collection('conversations').add({
            role: 'assistant',
            content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
            projectId,
            timestamp: FieldValue.serverTimestamp()
        })
        await db.collection('conversations').add({
            role: 'assistant',
            content: 'Now making changes to your website...',
            projectId,
            timestamp: FieldValue.serverTimestamp()
        })

        await db.collection('conversations').add({
            role: 'assistant',
            content: "Step 2/2: Updating your website code based on the new request...",
            projectId,
            timestamp: FieldValue.serverTimestamp()
        })

        // Generate website code
        const codeGenerationResponse = await callAIWithRetry({
            messages: [
                {
                    role: 'system',
                    content: `
                    You are an expert web developer. 

                    CRITICAL REQUIREMENTS:
                    - Return ONLY the complete updated HTML code with the requested changes.
                    - Use Tailwind CSS for ALL styling (NO custom CSS).
                    - Use Tailwind utility classes for all styling changes.
                    - Include all JavaScript in <script> tags before closing </body>
                    - Make sure it's a complete, standalone HTML document with Tailwind CSS
                    - Return the HTML Code Only, nothing else

                    Apply the requested changes while maintaining the Tailwind CSS styling approach.`
                },
                {
                    role: 'user',
                    content: `
                    Here is the current website code: "${currentProject?.current_code}" The user wants this change: "${enhancedPrompt}"`
                }
            ]
        });

        const code = codeGenerationResponse.choices[0].message.content || '';

        if(!code){
             await db.collection('conversations').add({
                role: 'assistant',
                content: "Unable to generate the code, please try again",
                projectId,
                timestamp: FieldValue.serverTimestamp()
            })
            await userRef.update({
                credits: FieldValue.increment(5)
            })
            await projectRef.update({
                status: 'error',
                updatedAt: FieldValue.serverTimestamp()
            })
            return;
        }

        const cleanCode = code.replace(/```[a-z]*\n?/gi, '')
                .replace(/```$/g, '')
                .trim();

        const versionRef = db.collection('versions').doc();
        await versionRef.set({
            code: cleanCode,
            description: 'changes made',
            projectId,
            timestamp: FieldValue.serverTimestamp()
        })

        await db.collection('conversations').add({
            role: 'assistant',
            content: "I've made the changes to your website! You can now preview it",
            projectId,
            timestamp: FieldValue.serverTimestamp()
        })

        await projectRef.update({
            current_code: cleanCode,
            current_version_index: versionRef.id,
            status: 'completed',
            updatedAt: FieldValue.serverTimestamp()
        })
        
        res.json({message: 'Changes made successfully'})
    } catch (error : any) {
        if(userId) {
             await db.collection('users').doc(userId).update({
                credits: FieldValue.increment(5)
            }).catch(e => console.error("Refund failed", e));
        }
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to rollback to a specific version
export const rollbackToVersion = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { projectId, versionId } = req.params;

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists || projectDoc.data()?.userId !== userId) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const versionDoc = await db.collection('versions').doc(versionId).get();

        if(!versionDoc.exists || versionDoc.data()?.projectId !== projectId){
            return res.status(404).json({ message: 'Version not found' });
        }

        await projectRef.update({
            current_code: versionDoc.data()?.code,
            current_version_index: versionId,
            updatedAt: FieldValue.serverTimestamp()
        })

        await db.collection('conversations').add({
            role: 'assistant',
            content: "I've rolled back your website to selected version. You can now preview it",
            projectId,
            timestamp: FieldValue.serverTimestamp()
        })

        res.json({ message: 'Version rolled back' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Delete a Project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;

        if(!userId) return res.status(401).json({ message: 'Unauthorized' });

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        if(!projectDoc.exists || projectDoc.data()?.userId !== userId) {
             return res.status(404).json({ message: 'Project not found' });
        }

        // Technically we should delete sub-collections or related docs (versions, conversations)
        // But for parity with simple deletes, we'll just delete the project document.
        await projectRef.delete();

        res.json({ message: 'Project deleted successfully' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller for getting project code for preview
export const getProjectPreview = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const projectDoc = await db.collection('projects').doc(projectId).get();

        if(!projectDoc.exists || projectDoc.data()?.userId !== userId){
            return res.status(404).json({ message: 'Project not found' });
        }

        const versionsSnapshot = await db.collection('versions')
            .where('projectId', '==', projectId)
            .orderBy('timestamp', 'asc')
            .get();
            
        const versions = versionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({ project: { id: projectDoc.id, ...projectDoc.data(), versions } });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Get published projects
export const getPublishedProjects = async (req: Request, res: Response) => {
    try {
       
        const projectsSnapshot = await db.collection('projects')
            .where('isPublished', '==', true)
            .get();

        // In original codebase logic it does `include: {user: true}`. We fetch users manually.
        // It's not usually a lot of published projects per page or we can just fetch sequentially.
        const projects = await Promise.all(projectsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            let user = null;
            if(data.userId) {
                const userDoc = await db.collection('users').doc(data.userId).get();
                if(userDoc.exists) {
                     user = { id: userDoc.id, ...userDoc.data() };
                }
            }
            return { id: doc.id, ...data, user };
        }));

        res.json({ projects });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Get a single project by id
export const getProjectById = async (req: Request, res: Response) => {
    try {
       const { projectId } = req.params;

        const projectDoc = await db.collection('projects').doc(projectId).get();
        const project = projectDoc.data();

        if(!projectDoc.exists || project?.isPublished === false || !project?.current_code){
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ code: project.current_code });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller to save project code
export const saveProjectCode = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        const {code} = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if(!code){
            return res.status(400).json({ message: 'Code is required' });
        }

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get()

        if(!projectDoc.exists || projectDoc.data()?.userId !== userId){
            return res.status(404).json({ message: 'Project not found' });
        }

        await projectRef.update({
            current_code: code,
            current_version_index: '',
            updatedAt: FieldValue.serverTimestamp()
        })

        res.json({ message: 'Project saved successfully' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}