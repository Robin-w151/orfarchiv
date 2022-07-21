import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Story, StorySchema } from './schemas/story.schema';
import { StoriesService } from './stories.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Story.name, schema: StorySchema }])],
  providers: [StoriesService],
})
export class StoriesModule {}
