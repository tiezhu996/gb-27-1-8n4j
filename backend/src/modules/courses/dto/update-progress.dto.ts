import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  progress: number;
}
