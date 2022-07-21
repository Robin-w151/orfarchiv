import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [ScraperService],
})
export class ScraperModule {}
