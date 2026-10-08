import {canManage,canWork,publicUser,hash,id,now,divisions} from '../store.js';
export function registerNotificationsRoutes(app,context){
 const {db,save,error,text,note,audit}=context;
 app.patch('/api/notifications',async (req,res)=>{db.notifications.filter(n=>n.recipient===req.user.id&&(!req.body.id||n.id===req.body.id)).forEach(n=>n.read=true);await save();res.json({ok:true})});
}

