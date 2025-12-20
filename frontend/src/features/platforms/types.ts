export interface Platform {
  id: string
  name: string
  corporateName?: string
  defaultSplit: number
}

export interface CreatePlatformDTO extends Omit<Platform, 'id'> {}

export interface UpdatePlatformDTO extends Partial<CreatePlatformDTO> {}
