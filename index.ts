import { app } from './src/app.ts';
import { env } from './src/config/env.ts';

app.listen(env.port, () => {
  console.log(`Server is running on http://localhost:${env.port}`);
});