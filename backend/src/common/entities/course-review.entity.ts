import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('course_reviews')
@Unique(['studentId', 'courseId'])
export class CourseReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  courseId: string;

  @Column()
  studentId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'text', nullable: true })
  reply: string;

  @Column({ type: 'timestamp', nullable: true })
  repliedAt: Date;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
