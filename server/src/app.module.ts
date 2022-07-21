import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScraperModule } from './scraper/scraper.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { StoriesModule } from './stories/stories.module';

@Module({
  imports: [
    // MongooseModule.forRoot('mongodb://localhost/orfarchiv'),
    ScheduleModule.forRoot(),
    ScraperModule,
    // StoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
