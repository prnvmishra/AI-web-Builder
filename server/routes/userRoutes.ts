import express from 'express';
import { createUserProject, getUserCredits, getUserProject, getUserProjects, purchaseCredits, togglePublish, saveUserProfile } from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';

const userRouter = express.Router();

userRouter.post('/profile', protect, saveUserProfile)
userRouter.get('/credits',protect, getUserCredits)
userRouter.post('/project',protect, createUserProject)
userRouter.get('/project/:projectId',protect, getUserProject)
userRouter.get('/projects',protect, getUserProjects)
userRouter.get('/publish-toggle/:projectId',protect, togglePublish)
userRouter.post('/purchase-credits',protect, purchaseCredits)

export default userRouter