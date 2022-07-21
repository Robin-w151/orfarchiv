import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type StoryDocument = Story & Document;

@Schema()
export class Story {
  @Prop({ unique: true })
  usid: string;

  @Prop()
  title: string;

  @Prop()
  url: string;

  @Prop()
  timestamp: string;
}

export const StorySchema = SchemaFactory.createForClass(Story);
