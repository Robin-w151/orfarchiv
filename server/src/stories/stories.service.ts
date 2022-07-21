import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Story, StoryDocument } from './schemas/story.schema';
import { Model } from 'mongoose';

@Injectable()
export class StoriesService {
  constructor(@InjectModel(Story.name) private readonly storyModel: Model<StoryDocument>) {}
}
