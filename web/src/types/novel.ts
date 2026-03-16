export interface Novel {
  id: number
  chapterIndex: number
  reel: string
  chapter: string
  chapterData: string
  projectId: number
  createTime: number
}

export interface CreateNovelParams {
  chapterIndex: number
  reel?: string
  chapter?: string
  chapterData: string
  projectId: number
}