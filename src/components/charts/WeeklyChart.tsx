import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface WeeklyChartProps {
  data: { day: string; shortDay: string; chapters: number }[];
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map((d) => d.shortDay),
    datasets: [
      {
        label: 'Capítulos leídos',
        data: data.map((d) => d.chapters),
        backgroundColor: data.map((d, idx) =>
          idx === data.length - 1 || d.chapters >= 12
            ? 'rgba(168, 85, 247, 0.95)'
            : 'rgba(139, 92, 246, 0.65)'
        ),
        hoverBackgroundColor: 'rgba(192, 132, 252, 1)',
        borderRadius: 8,
        borderSkipped: false,
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e1935',
        titleColor: '#e9d5ff',
        bodyColor: '#ffffff',
        borderColor: '#a855f7',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (items: any) => {
            const index = items[0].dataIndex;
            return data[index].day;
          },
          label: (context: any) => ` ${context.raw} capítulos leídos`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
            weight: 600 as const,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 10,
          },
          stepSize: 4,
        },
        border: {
          dash: [4, 4],
        },
      },
    },
  };

  return (
    <div style={{ height: '180px', width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};
