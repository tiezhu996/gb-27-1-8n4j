import { Row, Col, Card, Typography, Tag, Button, Space, Descriptions, List, Avatar, message, Modal, Form, Input, Rate, Progress, Empty } from 'antd';
import { PlayCircleOutlined, BookOutlined, EditOutlined, StarFilled, MessageOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { courseApi } from '@/api/course';
import { Course, CourseType, CourseLesson, CourseEnrollment, CourseReview } from '@/types/course';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types/user';

const { Title, Text, Paragraph } = Typography;

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [myReview, setMyReview] = useState<CourseReview | null>(null);
  const [reviewForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<CourseReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [playingLesson, setPlayingLesson] = useState<CourseLesson | null>(null);
  const [watchedLessonIds, setWatchedLessonIds] = useState<Set<string>>(new Set());
  const { user, isAuthenticated } = useAuthStore();

  const enrolled = !!enrollment;
  const progressPercent = enrollment ? Math.min(100, Number(enrollment.progress)) : 0;
  const completed = progressPercent >= 100;

  useEffect(() => {
    if (id) {
      loadCourse();
    }
  }, [id]);

  const loadCourse = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await courseApi.get(id);
      setCourse(data);
      setReviews(await courseApi.getReviews(id));
      if (isAuthenticated) {
        const e = await courseApi.getEnrollment(id);
        setEnrollment(e);
        if (e) {
          const mine = await courseApi.getMyReview(id);
          setMyReview(mine);
          if (mine) reviewForm.setFieldsValue({ rating: mine.rating, comment: mine.comment });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const reloadReviews = async () => {
    if (!id) return;
    setReviews(await courseApi.getReviews(id));
    const mine = await courseApi.getMyReview(id);
    setMyReview(mine);
    const updatedCourse = await courseApi.get(id);
    setCourse(updatedCourse);
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }
    if (!id) return;

    Modal.confirm({
      title: '确认报名',
      content: course?.type === CourseType.PAID
        ? `确定支付 ¥${course.price} 报名该课程？`
        : '确定报名该免费课程？',
      onOk: async () => {
        try {
          const e = await courseApi.enroll(id);
          setEnrollment(e);
          message.success('报名成功');
        } catch (error: any) {
          message.error(error.response?.data?.message || '报名失败');
        }
      },
    });
  };

  // 根据已看完的课时计算学习进度百分比
  const calcProgress = (watched: Set<string>) => {
    const lessons = course?.lessons || [];
    if (lessons.length === 0) return 0;
    return Math.round((watched.size / lessons.length) * 100);
  };

  const reportProgress = async (watched: Set<string>) => {
    if (!id) return;
    const newProgress = calcProgress(watched);
    try {
      const e = await courseApi.updateProgress(id, newProgress);
      setEnrollment(e);
    } catch {
      // 进度上报失败不影响观看
    }
  };

  const handleVideoEnded = () => {
    if (!playingLesson) return;
    message.success(`已完成课时《${playingLesson.title}》`);
    const watched = new Set(watchedLessonIds);
    watched.add(playingLesson.id);
    setWatchedLessonIds(watched);
    reportProgress(watched);
    setPlayingLesson(null);
  };

  const handlePlayLesson = (lesson: CourseLesson) => {
    if (lesson.isLive) {
      navigate(`/live/${lesson.id}`);
    } else if (lesson.videoUrl) {
      setPlayingLesson(lesson);
    } else {
      message.info('暂无视频');
    }
  };

  const handleSubmitReview = async () => {
    if (!id) return;
    try {
      const values = await reviewForm.validateFields();
      setSubmitting(true);
      await courseApi.submitReview(id, {
        rating: values.rating,
        comment: values.comment,
      });
      message.success(myReview ? '评价已更新' : '评价提交成功');
      await reloadReviews();
    } catch (error: any) {
      if (error?.errorFields) return; // 表单校验错误
      message.error(error.response?.data?.message || '评价提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyTarget) return;
    try {
      setReplying(true);
      await courseApi.replyReview(replyTarget.id, replyText);
      message.success('回复成功');
      setReplyTarget(null);
      setReplyText('');
      await reloadReviews();
    } catch (error: any) {
      message.error(error.response?.data?.message || '回复失败');
    } finally {
      setReplying(false);
    }
  };

  if (loading) {
    return <Card><div style={{ textAlign: 'center', padding: 50 }}>加载中...</div></Card>;
  }

  if (!course) {
    return <Card><div style={{ textAlign: 'center', padding: 50 }}>课程不存在</div></Card>;
  }

  const isTeacher = user?.id === course.teacherId;
  const canReview = enrolled && completed && user?.role === UserRole.STUDENT;

  return (
    <div>
      <Row gutter={24}>
        <Col span={16}>
          <Card>
            <Row gutter={24}>
              <Col span={10}>
                <img
                  src={course.cover}
                  alt={course.name}
                  style={{ width: '100%', borderRadius: 8 }}
                  onError={(e: any) => {
                    e.target.src = `https://picsum.photos/seed/course${course.id}/400/300`;
                  }}
                />
              </Col>
              <Col span={14}>
                <Title level={2}>{course.name}</Title>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Tag color={course.type === CourseType.PAID ? 'gold' : 'green'}>
                    {course.type === CourseType.PAID ? `¥${course.price}` : '免费'}
                  </Tag>
                  <Tag>{course.category}</Tag>
                  {course.tags?.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
                <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  {course.description}
                </Paragraph>
                <Space style={{ marginBottom: 16 }}>
                  <Avatar icon={<BookOutlined />} />
                  <Text>{course.teacher?.name || '未知教师'}</Text>
                </Space>
                <Space style={{ marginBottom: 16 }}>
                  <StarFilled style={{ color: '#faad14' }} />
                  {course.reviewCount && course.reviewCount > 0 ? (
                    <Text>
                      平均 {Number(course.averageRating).toFixed(1)} 分 · {course.reviewCount} 人评价
                    </Text>
                  ) : (
                    <Text type="secondary">暂无评价</Text>
                  )}
                </Space>
                {enrolled && !isTeacher && (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">学习进度</Text>
                    <Progress percent={progressPercent} status={completed ? 'success' : 'active'} size="small" />
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  {isTeacher ? (
                    <Space>
                      <Button type="primary" icon={<EditOutlined />}>
                        编辑课程
                      </Button>
                      <Button
                        type="primary"
                        onClick={() => navigate('/create-course')}
                      >
                        新建课时
                      </Button>
                    </Space>
                  ) : enrolled ? (
                    <Button type="primary" size="large">
                      已报名{completed ? ' · 已完成' : ''}
                    </Button>
                  ) : (
                    <Button type="primary" size="large" onClick={handleEnroll}>
                      立即报名
                    </Button>
                  )}
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="课程简介">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="分类">{course.category}</Descriptions.Item>
              <Descriptions.Item label="课时数">
                {course.lessons?.length || 0} 课时
              </Descriptions.Item>
              <Descriptions.Item label="课程类型">
                {course.type === CourseType.PAID ? '付费' : '免费'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="课程目录" style={{ marginTop: 24 }}>
        <List
          itemLayout="horizontal"
          dataSource={course.lessons || []}
          locale={{ emptyText: '暂无课时' }}
          renderItem={(lesson, index) => (
            <List.Item
              actions={
                enrolled || isTeacher
                  ? [
                      <Button
                        type="link"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handlePlayLesson(lesson)}
                      >
                        {lesson.isLive ? '进入直播' : watchedLessonIds.has(lesson.id) ? '重新观看' : '观看视频'}
                      </Button>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ background: '#1890ff' }}>
                    {index + 1}
                  </Avatar>
                }
                title={
                  <Space>
                    {lesson.title}
                    {lesson.isLive && <Tag color="red">直播</Tag>}
                    {watchedLessonIds.has(lesson.id) && <Tag color="green">已看完</Tag>}
                  </Space>
                }
                description={`${lesson.duration} 分钟`}
              />
            </List.Item>
          )}
        />
      </Card>

      <Card
        title={
          <Space>
            <StarFilled style={{ color: '#faad14' }} />
            <span>课程评价</span>
            {course.reviewCount && course.reviewCount > 0 && (
              <Tag color="orange">
                平均 {Number(course.averageRating).toFixed(1)} 分 · {course.reviewCount} 人
              </Tag>
            )}
          </Space>
        }
        style={{ marginTop: 24 }}
      >
        {canReview && (
          <Card
            type="inner"
            size="small"
            title={myReview ? '修改我的评价' : '我要评价（课程已完成）'}
            style={{ marginBottom: 16 }}
          >
            <Form form={reviewForm} layout="vertical">
              <Form.Item
                name="rating"
                label="评分"
                rules={[{ required: true, message: '请选择评分' }]}
              >
                <Rate />
              </Form.Item>
              <Form.Item
                name="comment"
                label="评价内容"
                rules={[
                  { required: true, message: '请输入评价内容' },
                  { whitespace: true, message: '评价内容不能为空' },
                ]}
              >
                <Input.TextArea rows={3} placeholder="分享你的学习感受..." maxLength={500} showCount />
              </Form.Item>
              <Button type="primary" loading={submitting} onClick={handleSubmitReview}>
                {myReview ? '更新评价' : '提交评价'}
              </Button>
            </Form>
          </Card>
        )}

        {enrolled && !completed && !isTeacher && (
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            完成全部课时（学习进度达到 100%）后即可评价该课程，当前进度 {progressPercent}%。
          </Paragraph>
        )}

        <List
          itemLayout="vertical"
          dataSource={reviews}
          locale={{ emptyText: <Empty description="暂无评价，完成课程后快来发表第一条评价吧" /> }}
          renderItem={(review) => (
            <List.Item key={review.id}>
              <List.Item.Meta
                avatar={<Avatar src={review.student?.avatar}>{review.student?.name?.[0] || '学'}</Avatar>}
                title={
                  <Space>
                    <Text strong>{review.student?.name || '匿名学生'}</Text>
                    <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text>{review.comment}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(review.createdAt).toLocaleString('zh-CN')}
                      {myReview?.id === review.id && ' · 我的评价'}
                    </Text>
                  </Space>
                }
              />
              {review.reply ? (
                <div style={{ background: '#fafafa', padding: '8px 12px', borderRadius: 6, marginTop: 8 }}>
                  <Space align="start">
                    <MessageOutlined style={{ marginTop: 4 }} />
                    <div>
                      <Text strong>教师回复：</Text>
                      <Text>{review.reply}</Text>
                      {review.repliedAt && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(review.repliedAt).toLocaleString('zh-CN')}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Space>
                </div>
              ) : isTeacher ? (
                <Button
                  type="link"
                  style={{ paddingLeft: 0, marginTop: 4 }}
                  onClick={() => {
                    setReplyTarget(review);
                    setReplyText('');
                  }}
                >
                  回复评价
                </Button>
              ) : null}
            </List.Item>
          )}
        />
      </Card>

      <Modal
        open={!!playingLesson}
        title={playingLesson?.title}
        footer={null}
        onCancel={() => setPlayingLesson(null)}
        width={720}
        destroyOnClose
      >
        {playingLesson?.videoUrl && (
          <video
            src={playingLesson.videoUrl}
            controls
            autoPlay
            style={{ width: '100%' }}
            onEnded={handleVideoEnded}
          />
        )}
        <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          看完整个视频后将自动记录课时完成情况，并更新学习进度。
        </Paragraph>
      </Modal>

      <Modal
        title="回复评价"
        open={!!replyTarget}
        onOk={handleReply}
        confirmLoading={replying}
        onCancel={() => setReplyTarget(null)}
        okText="提交回复"
        cancelText="取消"
      >
        <Input.TextArea
          rows={4}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="请输入回复内容"
          maxLength={500}
          showCount
        />
      </Modal>
    </div>
  );
}
