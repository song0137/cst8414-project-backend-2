import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import wardrobeRoutes from '../modules/wardrobe/wardrobe.routes';
import recommendationsRoutes from '../modules/recommendations/recommendations.routes';
import quizRoutes from '../modules/quiz/quiz.routes';
import shoppingRoutes from '../modules/shopping/shopping.routes';
import reviewsRoutes from '../modules/reviews/reviews.routes';
import socialRoutes from '../modules/social/social.routes';
import blogRoutes from '../modules/blog/blog.routes';
import usersRoutes from '../modules/users/users.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/wardrobe', wardrobeRoutes);
router.use('/recommendations', recommendationsRoutes);
router.use('/quiz', quizRoutes);
router.use('/products', shoppingRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/social', socialRoutes);
router.use('/blog', blogRoutes);
router.use('/users', usersRoutes);

export default router;
