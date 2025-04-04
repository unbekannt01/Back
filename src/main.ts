/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config(); // Load .env file
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cors = require("cors");

// Enable CORS
app.enableCors({
  origin: "*", // ✅ Allow all origins
  credentials: true, // ✅ Allow cookies/sessions
});

  console.log("Hello Buddy..!")
  
  // const config = new DocumentBuilder()
  //   .setTitle('API')
  //   .setDescription('This is Open API')
  //   .setVersion('1.0')
  //   .build();
  // const documentFactory = () => SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api', app, documentFactory);                                                          

  await app.listen(process.env.PORT || 4000);
}
bootstrap();