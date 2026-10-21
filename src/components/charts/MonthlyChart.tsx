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

interface MonthlyChartProps {
  data: { month: string; shortMonth: string; chapters: number }[];
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map((d) => d.shortMonth),
    datasets: [
      {
        label: 'Capítulos por mes',
        data: data.map((d) => d.chapters),
        backgroundColor: data.map((d) =>
          d.chapters > 0 ? 'rgba(168, 85, 247, 0.85)' : 'rgba(255, 255, 255, 0.05)'
        ),
        hoverBackgroundColor: 'rgba(216, 180, 254, 1)',
        borderRadius: 6,
        borderSkipped: false,
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
        borderColor: '#8b5cf6',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (items: any) => {
            const index = items[0].dataIndex;
            return data[index].month;
          },
          label: (context: any) => ` ${context.raw} capítulos`,
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
            size: 10,
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
        },
      },
    },
  };

  return (
    <div style={{ height: '200px', width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};
