import React from 'react';
import { Phone, Mail, FileText, CheckCircle, Clock } from 'lucide-react';
import styles from './ActivityTimeline.module.css';

const getIcon = (type) => {
  switch (type) {
    case 'call': return <Phone size={18} />;
    case 'email': return <Mail size={18} />;
    case 'note': return <FileText size={18} />;
    case 'status': return <CheckCircle size={18} />;
    default: return <Clock size={18} />;
  }
};

const ActivityTimeline = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No recent activity.</div>;
  }

  return (
    <div className={styles.timeline}>
      {activities.map((activity) => (
        <div key={activity.id} className={styles.timelineItem}>
          <div className={styles.timelineIcon}>
            {getIcon(activity.type)}
          </div>
          <div className={styles.timelineContent}>
            <div className={styles.timelineHeader}>
              <span className={styles.timelineTitle}>{activity.title}</span>
              <span className={styles.timelineDate}>{activity.date}</span>
            </div>
            <div className={styles.timelineBody}>
              {activity.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
