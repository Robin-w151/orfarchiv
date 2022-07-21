import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Story } from './models/story';
import { XMLParser } from 'fast-xml-parser';
import { RdfDocument, RdfItem } from './models/orfRss';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  private static filterStoryRdfItem(rdfItem: RdfItem): boolean {
    return rdfItem && rdfItem.link?.includes('stories');
  }

  private static mapToStory(rdfItem: RdfItem): Story {
    return {
      id: rdfItem['orfon:usid'],
      title: rdfItem.title.trim(),
      category: rdfItem['dc:subject'],
      url: rdfItem.link,
      timestamp: rdfItem['dc:date'],
    };
  }

  constructor(private readonly httpService: HttpService) {}

  @Cron('*/5 * * * * *')
  scraperTask() {
    this.logger.debug('TEST');
    this.scrapeOrfNews();
  }

  private async scrapeOrfNews(): Promise<void> {
    const data = await this.fetchOrfNews();
    const stories = this.collectStories(data);
    this.logger.log(JSON.stringify(stories));
  }

  private async fetchOrfNews(): Promise<string> {
    return (await firstValueFrom(this.httpService.get('https://rss.orf.at/news.xml'))).data;
  }

  private collectStories(data: string): Array<Story> {
    const document: RdfDocument = this.parser.parse(data);
    const items = document?.['rdf:RDF']?.item;
    return items?.filter(ScraperService.filterStoryRdfItem).map(ScraperService.mapToStory) ?? [];
  }
}
