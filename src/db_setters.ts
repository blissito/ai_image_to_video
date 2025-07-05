import path from "path";
import fs from "fs";

export const updateUserCredits = ({
    email,
    credits
}: {
    email: string;
    credits: number;
}) => {
      // @todo real db
      // @TODO: create if not exists
      const dbPath = path.join(process.cwd(), 'data/db.json');
      const db = fs.readFileSync(dbPath, 'utf-8');
      const data = JSON.parse(db);
      const user = data.users.find((user: any) => user.email ===email);
      if (user) {
        user.credits += parseInt(credits.toString() || '0');
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
  const user = data.users.find((user: any) => user.email ===email);
  return user;  
}