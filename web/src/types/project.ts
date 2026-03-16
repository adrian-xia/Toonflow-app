export interface Project {
  id: number
  name: string
  intro: string
  type: string
  artStyle: string
  videoRatio: string
  createTime: number
  userId: number
}

export interface CreateProjectParams {
  name: string
  intro?: string
  type?: string
  artStyle?: string
  videoRatio?: string
}

export interface UpdateProjectParams extends Partial<CreateProjectParams> {
  id: number
}