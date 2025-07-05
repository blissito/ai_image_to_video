import path from "path";
import fs from "fs";

export const updateUserCredits = ({
    email,
    credits,
    videoId
}: {
    email: string;
    credits: number;
    videoId?: string;
}) => {
      // @todo real db
      // @TODO: create if not exists
      const dbPath = path.join(process.cwd(), 'data/db.json');
      const db = fs.readFileSync(dbPath, 'utf-8');
      const data = JSON.parse(db);

      const userIndex = data.users.findIndex((user: any) => user.email === email);
        
      if (userIndex === -1) {
          // User doesn't exist, you might want to create them here
          console.log('Usuario no encontrado:', email);
          data.users.push({
            email,
            credits: 0,
            videoIds: [videoId],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            bucketLinks: []
          });
          fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
          return true;
      }

      const user = data.users[userIndex];
      const newCredits = user.credits + credits;
      if (user) {
        user.credits = newCredits<0?0:newCredits;
        user.videoIds.push(videoId);
        user.updatedAt = new Date().toISOString();
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        console.log(`Créditos actualizados para ${user.email}. Nuevo total: ${user.credits}`);
      } else {
        console.log('Usuario no encontrado:', email);
      }    
}

export const getUser = (email:string)=>{
  const dbPath = path.join(process.cwd(), 'data/db.json');
  const db = fs.readFileSync(dbPath, 'utf-8');
  const data = JSON.parse(db);
  const userIndex = data.users.findIndex((user: any) => user.email === email);
  const user = data.users[userIndex];
  return user;  
}

export const sufficientCredits = (email:string)=>{
  const user = getUser(email);
  return user.credits > 0;
} 