export interface LearningImage {
  publicId: string;
  url: string;
}

export interface LearningEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  categoryId: string;
  images: LearningImage[];
  relatedGoalId?: string;
  learnedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
