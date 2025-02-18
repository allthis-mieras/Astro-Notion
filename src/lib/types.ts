import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export interface Issue {
  id: string;
  coverUrl?: string;
  title: string;
  date: string;
  uniqueId: number;
  description?: string;
  raw: PageObjectResponse;
}