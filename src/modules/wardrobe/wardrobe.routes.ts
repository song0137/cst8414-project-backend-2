import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as controller from './wardrobe.controller';

const router = Router();

router.use(requireAuth);
router.post('/items', controller.createItem);
router.get('/items', controller.listItems);
router.patch('/items/:id', controller.updateItem);
router.delete('/items/:id', controller.deleteItem);

export default router;
