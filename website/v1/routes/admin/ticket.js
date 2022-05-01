const { getTickets,updateTicket,deleteTicket } = require('../../controllers/admin/ticket');
const verifyAdmin = require('../../middlewares/verifyAdmin');

const router=require('express').Router();
router.get('/admin/tickets',verifyAdmin,getTickets);
router.patch('/admin/tickets/:id',verifyAdmin,updateTicket);
router.delete('/admin/tickets/:id',verifyAdmin,deleteTicket);

module.exports=router;