import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Calendar.module.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = ['12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'];

// Helper to get days in a month
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const Calendar = ({ tasks = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('Month'); // 'Day', 'Week', 'Month', 'List'
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrev = () => {
    if (view === 'Month') setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    if (view === 'Week') setCurrentDate(new Date(currentYear, currentMonth, currentDate.getDate() - 7));
    if (view === 'Day') setCurrentDate(new Date(currentYear, currentMonth, currentDate.getDate() - 1));
  };

  const handleNext = () => {
    if (view === 'Month') setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    if (view === 'Week') setCurrentDate(new Date(currentYear, currentMonth, currentDate.getDate() + 7));
    if (view === 'Day') setCurrentDate(new Date(currentYear, currentMonth, currentDate.getDate() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Get week dates for Week View
  const getWeekDates = () => {
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day; // Adjust to Sunday
    const startOfWeek = new Date(currentDate.setDate(diff));
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
    }
    return dates;
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const gridCells = [];
    
    for (let i = 0; i < firstDay; i++) {
      const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
      gridCells.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthDays - firstDay + i + 1),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      gridCells.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: true,
      });
    }

    const totalCells = Math.ceil(gridCells.length / 7) * 7;
    const remainingCells = totalCells - gridCells.length;
    for (let i = 1; i <= remainingCells; i++) {
      gridCells.push({
        date: new Date(currentYear, currentMonth + 1, i),
        isCurrentMonth: false,
      });
    }

    return (
      <div className={styles.calendarGrid}>
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className={styles.dayName}>{day}</div>
        ))}
        
        <div className={styles.daysGrid}>
          {gridCells.map((cell, idx) => {
            const dayTasks = tasks.filter(task => {
              if (!task.date) return false;
              // Parse YYYY-MM-DD as local date to prevent timezone shift
              const [y, m, d] = task.date.split('-');
              const taskDate = new Date(y, m - 1, d);
              return taskDate.getDate() === cell.date.getDate() &&
                     taskDate.getMonth() === cell.date.getMonth() &&
                     taskDate.getFullYear() === cell.date.getFullYear();
            });

            return (
              <div 
                key={idx} 
                className={`${styles.dayCell} ${!cell.isCurrentMonth ? styles.empty : ''} ${isToday(cell.date) ? styles.today : ''}`}
              >
                <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                {dayTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`${styles.taskItem} ${task.urgent ? styles.urgent : ''} ${task.completed ? styles.completed : ''}`}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimeGrid = (dates) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Header Row */}
        <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${dates.length}, 1fr)` }}>
          <div className={styles.dayName} style={{ borderRight: '1px solid var(--border-color)' }}></div>
          {dates.map(date => (
            <div key={date.toString()} className={styles.dayName}>
              {view === 'Day' ? date.toLocaleDateString('default', { weekday: 'long' }) : `${DAYS_OF_WEEK[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`}
            </div>
          ))}
        </div>
        
        {/* Time Grid Body */}
        {/* Time Grid Body */}
        <div className={styles.timeGridContainer} style={{ flexDirection: 'column' }}>
          
          {/* All Day Row */}
          <div style={{ display: 'flex', width: '100%', minHeight: '40px', borderBottom: '1px solid var(--border-color)' }}>
            <div className={styles.timeColumn} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', borderRight: '1px solid var(--border-color)', borderBottom: 'none' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>all-day</span>
            </div>
            
            <div className={styles.daysContainer}>
              {dates.map((date, idx) => {
                const dayTasks = tasks.filter(task => {
                  if (!task.date) return false;
                  const [y, m, d] = task.date.split('-');
                  const taskDate = new Date(y, m - 1, d);
                  return taskDate.getDate() === date.getDate() &&
                         taskDate.getMonth() === date.getMonth() &&
                         taskDate.getFullYear() === date.getFullYear();
                });

                return (
                  <div key={idx} className={`${styles.dayColumn} ${isToday(date) ? styles.today : ''}`} style={{ borderBottom: 'none', padding: '4px' }}>
                    {dayTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`${styles.taskItem} ${task.urgent ? styles.urgent : ''} ${task.completed ? styles.completed : ''}`}
                        style={{ marginBottom: '4px' }}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Hourly Slots Row */}
          <div style={{ display: 'flex', width: '100%', flex: 1 }}>
            <div className={styles.timeColumn}>
              {HOURS.map(hour => (
                <div key={hour} className={styles.timeLabel}>{hour}</div>
              ))}
            </div>
            
            <div className={styles.daysContainer}>
              {dates.map((date, idx) => (
                <div key={idx} className={`${styles.dayColumn} ${isToday(date) ? styles.today : ''}`}>
                  {HOURS.map(hour => (
                    <div key={hour} className={styles.timeSlot}></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderTitle = () => {
    if (view === 'Month') return `${currentDate.toLocaleString('default', { month: 'long' })} ${currentYear}`;
    if (view === 'Day') return `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getDate()}, ${currentYear}`;
    if (view === 'Week') {
      const dates = getWeekDates();
      const start = dates[0];
      const end = dates[6];
      const startMonth = start.toLocaleString('default', { month: 'short' });
      const endMonth = end.toLocaleString('default', { month: 'short' });
      if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${currentYear}`;
      }
      return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${currentYear}`;
    }
    return '';
  };

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <h2 className={styles.monthTitle}>{renderTitle()}</h2>
        
        <div className={styles.viewToggles}>
          <button className={`${styles.toggleBtn} ${view === 'Day' ? styles.active : ''}`} onClick={() => setView('Day')}>Day</button>
          <button className={`${styles.toggleBtn} ${view === 'Week' ? styles.active : ''}`} onClick={() => setView('Week')}>Week</button>
          <button className={`${styles.toggleBtn} ${view === 'Month' ? styles.active : ''}`} onClick={() => setView('Month')}>Month</button>
          <button className={`${styles.toggleBtn} ${view === 'List' ? styles.active : ''}`} onClick={() => setView('List')}>List</button>
        </div>

        <div className={styles.navControls}>
          <button className={styles.navBtn} onClick={handlePrev}>
            <ChevronLeft size={16} />
          </button>
          <button className={styles.navBtn} onClick={handleNext}>
            <ChevronRight size={16} />
          </button>
          <button className={styles.todayBtn} onClick={handleToday}>today</button>
        </div>
      </div>

      {view === 'Month' && renderMonthView()}
      {view === 'Week' && renderTimeGrid(getWeekDates())}
      {view === 'Day' && renderTimeGrid([currentDate])}
      {view === 'List' && (
        <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>List view not implemented.</div>
      )}
    </div>
  );
};

export default Calendar;
