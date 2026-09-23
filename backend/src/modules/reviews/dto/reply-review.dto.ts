import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyReviewDto {
  @ApiProperty({ example: '感谢你的支持，继续加油！' })
  @IsString()
  reply: string;
}
