import { Card, Rate, List, Avatar, Typography, Button, Form, Input, Space, Tag, Empty, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { courseApi } from '@/api/course';
import { CourseReview, CourseReviewSummary } from '@/types/course';
import { useAuthStore } from '@/store/auth';

const { Text, Paragraph } = Typography;

interface CourseReviewsProps {
  courseId: string;
  enrollment: { progress: number } | null;
  isTeacher: boolean;
}

export default function CourseReviews({ courseId, enrollment, isTeacher }: CourseReviewsProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [summary, setSummary] = useState<CourseReviewSummary | null>(null);
  const [myReview, setMyReview] = useState<CourseReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [replyText, setReplyText] = useState('');

  const progress = enrollment ? Number(enrollment.progress) : 0;
  const canReview = isAuthenticated && !isTeacher && !!enrollment && progress >= 100;

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await courseApi.getReviews(courseId);
      setSummary(data);
      if (isAuthenticated && user?.role !== 'teacher') {
        const mine = await courseApi.getMyReview(courseId);
        setMyReview(mine);
        if (mine) {
          form.setFieldsValue({ rating: mine.rating, comment: mine.comment });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleSubmit = async (values: { rating: number; comment: string }) => {
    if (!values.rating) {
      message.warning('请先选择评分');
      return;
    }
    if (!values.comment?.trim()) {
      message.warning('请填写评价内容');
      return;
    }
    setSubmitting(true);
    try {
      const result = await courseApi.submitReview(courseId, {
        rating: values.rating,
        comment: values.comment.trim(),
      });
      setMyReview(result);
      message.success('评价提交成功');
      loadReviews();
    } catch (error: any) {
      message.error(error.response?.data?.message || '评价提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (review: CourseReview) => {
    if (!replyText.trim()) {
      message.warning('回复内容不能为空');
      return;
    }
    try {
      await courseApi.replyReview(review.id, replyText.trim());
      message.success('回复成功');
      setReplyingId(null);
      setReplyText('');
      loadReviews();
    } catch (error: any) {
      message.error(error.response?.data?.message || '回复失败');
    }
  };

  return (
    <Card
      title={
        <Space>
          <span>课程评价</span>
          {summary && (
            <Space size={4}>
              <Rate disabled allowHalf value={summary.averageRating} style={{ fontSize: 16 }} />
              <Text strong>{summary.averageRating}</Text>
              <Text type="secondary">（{summary.count} 人评价）</Text>
            </Space>
          )}
        </Space>
      }
      style={{ marginTop: 24 }}
      loading={loading}
    >
      {isAuthenticated && !isTeacher && (
        <div style={{ marginBottom: 24, padding: 24, background: '#fafafa', borderRadius: 8 }}>
          {canReview ? (
            <>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                {myReview ? '更新我的评价' : '我要评价'}
              </Text>
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item name="rating" label="评分" rules={[{ required: true, message: '请选择评分' }]}>
                  <Rate />
                </Form.Item>
                <Form.Item name="comment" label="评价内容" rules={[{ required: true, message: '请填写评价内容' }]}>
                  <Input.TextArea rows={3} placeholder="分享你的学习感受..." maxLength={500} showCount />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  {myReview ? '更新评价' : '提交评价'}
                </Button>
              </Form>
            </>
          ) : (
            <Text type="secondary">
              {!enrollment
                ? '报名课程后可在完成全部课程（进度100%）后发表评价'
                : `完成全部课程后才能评价，当前学习进度 ${progress}%`}
            </Text>
          )}
        </div>
      )}

      <List
        itemLayout="vertical"
        dataSource={summary?.list || []}
        locale={{ emptyText: <Empty description="暂无评价" /> }}
        renderItem={(review) => (
          <List.Item key={review.id}>
            <List.Item.Meta
              avatar={
                <Avatar src={review.student?.avatar} icon={<UserOutlined />}>
                  {review.student?.name?.[0]}
                </Avatar>
              }
              title={
                <Space>
                  <Text strong>{review.student?.name || '匿名用户'}</Text>
                  <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
                  {myReview?.id === review.id && <Tag color="blue">我的评价</Tag>}
                </Space>
              }
              description={
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text type="secondary">{new Date(review.createdAt).toLocaleString()}</Text>
                  <Paragraph style={{ marginBottom: 0 }}>{review.comment}</Paragraph>

                  {review.teacherReply && (
                    <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 8 }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space>
                          <Tag color="blue">教师回复</Tag>
                          {review.teacherRepliedAt && (
                            <Text type="secondary">
                              {new Date(review.teacherRepliedAt).toLocaleString()}
                            </Text>
                          )}
                        </Space>
                        <Text>{review.teacherReply}</Text>
                      </Space>
                    </div>
                  )}

                  {isTeacher && !review.teacherReply && (
                    <div>
                      {replyingId === review.id ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Input.TextArea
                            rows={2}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="回复该评价..."
                            maxLength={500}
                          />
                          <Space>
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => handleReply(review)}
                            >
                              发送回复
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setReplyingId(null);
                                setReplyText('');
                              }}
                            >
                              取消
                            </Button>
                          </Space>
                        </Space>
                      ) : (
                        <Button
                          type="link"
                          size="small"
                          style={{ padding: 0 }}
                          onClick={() => setReplyingId(review.id)}
                        >
                          回复
                        </Button>
                      )}
                    </div>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
