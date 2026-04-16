import {Request, Response, NextFunction} from 'express'
import { adminAuth } from '../lib/firebaseAdmin.js'

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized user. No Bearer token provided.' })
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        if(!decodedToken || !decodedToken.uid){
            return res.status(401).json({ message: 'Unauthorized user. Invalid token.'})
        }

        req.userId = decodedToken.uid;

        next()
    } catch (error: any) {
        console.log(error);
        res.status(401).json({ message: error.code || error.message || 'Authentication error' });
    }
}