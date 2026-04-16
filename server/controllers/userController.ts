import {Request, Response} from 'express'
import { db } from '../lib/firebaseAdmin.js';
import openai from '../configs/openai.js';
import Stripe from 'stripe'
import { v4 as uuidv4 } from 'uuid';
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

export const saveUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { name, phone } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // We use set with { merge: true } to create the document if it doesn't exist
        await db.collection('users').doc(userId).set({
            name: name || '',
            phone: phone || '',
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        res.json({ message: 'Profile saved successfully' });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};

// Get User Credits
export const getUserCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        let credits = 20;

        if (!userDoc.exists) {
            await userRef.set({
                credits: 20,
                totalCreation: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });
        } else {
            const data = userDoc.data();
            if (data?.credits === undefined) {
                await userRef.update({
                    credits: 20,
                    totalCreation: data?.totalCreation || 0,
                    createdAt: data?.createdAt || FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });
            } else {
                credits = data.credits;
            }
        }

        res.json({credits});
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to create New Project
export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    try {
        const { initial_prompt } = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        let userData = userDoc.data();

        if (!userDoc.exists || !userData || userData.credits === undefined) {
             await userRef.set({
                credits: 20,
                totalCreation: userData?.totalCreation || 0,
                createdAt: userData?.createdAt || FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
            userData = { ...userData, credits: 20, totalCreation: userData?.totalCreation || 0 };
        }

        if(userData.credits < 5){
            return res.status(403).json({ message: 'add credits to create more projects' });
        }

        // Create a new project
        const projectRef = db.collection('projects').doc();
        const projectId = projectRef.id;
        
        await projectRef.set({
            name: initial_prompt.length > 50 ? initial_prompt.substring(0, 47) + '...' : initial_prompt,
            initial_prompt,
            userId,
            isPublished: false,
            current_code: '',
            current_version_index: '',
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // Update User's Total Creation and Decrement credits
        await userRef.update({
            totalCreation: FieldValue.increment(1),
            credits: FieldValue.increment(-5),
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('conversations').add({
            role: 'user',
            content: initial_prompt,
            projectId: projectId,
            timestamp: FieldValue.serverTimestamp()
        });

        res.json({projectId: projectId})

        // Enhance user prompt
        console.log('Starting AI prompt enhancement for:', initial_prompt);
        await db.collection('conversations').add({
            role: 'assistant',
            content: "Step 1/2: Analyzing and enhancing your request...",
            projectId: projectId,
            timestamp: FieldValue.serverTimestamp()
        });

        const promptEnhanceResponse = await callAIWithRetry({
            messages: [
                {
                    role: 'system',
                    content: `
                    You are a prompt enhancement specialist. Take the user's website request and expand it into a detailed, comprehensive prompt that will help create the best possible website.

                    Enhance this prompt by:
                    1. Adding specific design details (layout, color scheme, typography)
                    2. Specifying key sections and features
                    3. Describing the user experience and interactions
                    4. Including modern web design best practices
                    5. Mentioning responsive design requirements
                    6. Adding any missing but important elements

                    Return ONLY the enhanced prompt, nothing else. Make it detailed but concise (2-3 paragraphs max).`
                },
                {
                    role: 'user',
                    content: initial_prompt
                }
            ]
        }, ['liquid/lfm-2.5-1.2b-instruct:free', 'nvidia/nemotron-3-super-120b-a12b:free']);

        const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;
        console.log('Enhanced prompt:', enhancedPrompt);

        await db.collection('conversations').add({
            role: 'assistant',
            content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
            projectId: projectId,
            timestamp: FieldValue.serverTimestamp()
        });

        await db.collection('conversations').add({
            role: 'assistant',
            content: 'now generating your website...',
            projectId: projectId,
            timestamp: FieldValue.serverTimestamp()
        });

        await db.collection('conversations').add({
            role: 'assistant',
            content: "Step 2/2: Prompt enhanced! Now generating the full website code... this may take a minute.",
            projectId: projectId,
            timestamp: FieldValue.serverTimestamp()
        });

        // Generate website code
        const codeGenerationResponse = await callAIWithRetry({
            messages: [
                {
                    role: 'system',
                     content: `
                     You are an expert web developer. Create a complete, production-ready, single-page website based on this request: "${enhancedPrompt}"

                    CRITICAL REQUIREMENTS:
                    - You MUST output valid HTML ONLY. 
                    - Use Tailwind CSS for ALL styling
                    - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                    - Use Tailwind utility classes extensively for styling, animations, and responsiveness
                    - Make it fully functional and interactive with JavaScript in <script> tag before closing </body>
                    - Use modern, beautiful design with great UX using Tailwind classes
                    - Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:)
                    - Use Tailwind animations and transitions (animate-*, transition-*)
                    - Include all necessary meta tags
                    - Use Google Fonts CDN if needed for custom fonts
                    - Use placeholder images from https://placehold.co/600x400
                    - Use Tailwind gradient classes for beautiful backgrounds
                    - Make sure all buttons, cards, and components use Tailwind styling

                    CRITICAL HARD RULES:
                    1. You MUST put ALL output ONLY into message.content.
                    2. You MUST NOT place anything in "reasoning", "analysis", "reasoning_details", or any hidden fields.
                    3. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
                    4. Do NOT include markdown, explanations, notes, or code fences.

                    The HTML should be complete and ready to render as-is with Tailwind CSS.`
                },
                {
                    role: 'user',
                    content: enhancedPrompt || ''
                }
            ]
        });

        const code = codeGenerationResponse.choices[0].message.content || '';

        if(!code){
             await db.collection('conversations').add({
                role: 'assistant',
                content: "Unable to generate the code, please try again",
                projectId: projectId,
                timestamp: FieldValue.serverTimestamp()
            });
            await userRef.update({
                credits: FieldValue.increment(5)
            });
            await projectRef.update({
                status: 'error',
                updatedAt: FieldValue.serverTimestamp()
            });
            return;
        }

        const cleanCode = code.replace(/```[a-z]*\n?/gi, '')
                .replace(/```$/g, '')
                .trim();

        // Create Version for the project
        const versionRef = db.collection('versions').doc();
        await versionRef.set({
            code: cleanCode,
            description: 'Initial version',
            projectId: projectId,
            timestamp: FieldValue.serverTimestamp()
        });

        await db.collection('conversations').add({
            role: 'assistant',
            content: "I've created your website! You can now preview it and request any changes.",
            projectId: projectId,
            timestamp: FieldValue.serverTimestamp()
        });

        await projectRef.update({
            current_code: cleanCode,
            current_version_index: versionRef.id,
            status: 'completed',
            updatedAt: FieldValue.serverTimestamp()
        });

    } catch (error : any) {
        console.log(error);
        if (userId) {
            // Refund the credits
            await db.collection('users').doc(userId).update({
                credits: FieldValue.increment(5)
            }).catch(e => console.error("Failed to refund credits", e));
        }
        
        // Log the failure to the conversation so the UI doesn't hang
        // (We can't get projectId safely if it failed before generation, but we assume if headers are sent, projectId exists)
        if (res.headersSent) {
             console.error("AI Generation failed silently in background");
        } else {
             res.status(500).json({ message: "API generation error. Your credits have been refunded." });
        }
    }
}

// Controller Function to Get A Single User Project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {projectId} = req.params;

        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (!projectDoc.exists || projectDoc.data()?.userId !== userId) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const projectData = { id: projectDoc.id, ...projectDoc.data() };

        // Fetch conversations
        const conversationsSnapshot = await db.collection('conversations')
            .where('projectId', '==', projectId)
            .orderBy('timestamp', 'asc')
            .get();
        
        const conversations = conversationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch versions
        const versionsSnapshot = await db.collection('versions')
            .where('projectId', '==', projectId)
            .orderBy('timestamp', 'asc')
            .get();
            
        const versions = versionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({ project: { ...projectData, conversation: conversations, versions: versions } });

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Get All Users Projects
export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

       const projectsSnapshot = await db.collection('projects')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .get();

       const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({projects})

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Toggle Project Publish
export const togglePublish = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {projectId} = req.params;

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if(!projectDoc.exists || projectDoc.data()?.userId !== userId){
            return res.status(404).json({ message: 'Project not found' });
        }
        
        const isPublished = projectDoc.data()?.isPublished;

        await projectRef.update({
            isPublished: !isPublished,
            updatedAt: FieldValue.serverTimestamp()
        });
       
        res.json({message: !isPublished ? 'Project Published Successfully' : 'Project Unpublished'})

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Purchase Credits
export const purchaseCredits = async (req: Request, res: Response) => {
    try {
        interface Plan {
            credits: number;
            amount: number;
        }

        const plans = {
            basic: {credits: 100, amount: 5},
            pro: {credits: 400, amount: 19},
            enterprise: {credits: 1000, amount: 49},
        }

        const userId = req.userId;
        const {planId} = req.body as {planId: keyof typeof plans}
        const origin = req.headers.origin as string;

        const plan: Plan = plans[planId]

        if(!plan || !userId){
            return res.status(404).json({ message: 'Plan not found' });
        }

        const transactionRef = db.collection('transactions').doc();
        await transactionRef.set({
            userId: userId,
            planId: req.body.planId,
            amount: plan.amount,
            credits: plan.credits,
            isPaid: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        const transactionId = transactionRef.id;

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        const session = await stripe.checkout.sessions.create({
                success_url: `${origin}/loading`,
                cancel_url: `${origin}`,
                line_items: [
                    {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `AiSiteBuilder - ${plan.credits} credits`
                        },
                        unit_amount: Math.floor(plan.amount) * 100
                    },
                    quantity: 1
                    },
                ],
                mode: 'payment',
                metadata: {
                    transactionId: transactionId,
                    appId: 'ai-site-builder'
                },
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expires in 30 minutes
                });

        res.json({payment_link: session.url})

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}