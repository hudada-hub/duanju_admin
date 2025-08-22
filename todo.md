pg_dump -Fc -U wzqwzq -d star_graph -f backup1.dump
恢复到新数据库
bash
复制
pg_restore -U wzqwzq -d new_db -v backup1.dump

DATABASE_URL="postgresql://wzqwzq:WZQwzq1012@localhost:5432/star_graph?schema=public"
备份数据

pg_dump -Fc -U root -d study_platform -f backup.dump
恢复到新数据库

pg_restore -U wzqwzq -d new_db -v backup.dump
DATABASE_URL="postgresql://root:root123456@49.233.182.71:5433/study_platform?schema=public"


公网： 49.233.182.71  22  
账号： root  
密码： 820035003Tengxunyun


[1Panel Log]: 您设置的面板安全入口是 0b4a88695d 
设置 1Panel 面板用户 (默认是 f9d8fbd027): 
[1Panel Log]: 设置 1Panel 面板密码，设置后按回车键继续 (默认是 4251beff84)


docker run -d --name study_pgsql -e POSTGRES_USER=root -e POSTGRES_PASSWORD=root123456 -e POSTGRES_DB=study_platform -p 5432:5432 postgres:15
数据库迁移命令：npx prisma migrate dev --name init


npx ts-node src/init-admin.ts

prisma generate&&npx prisma db push
git push origin main && git push github main

