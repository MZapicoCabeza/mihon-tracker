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
        backgroundColor: data.map((d, idx) =>
          idx === data.length - 1 ? '#8B5CF6' : d.chapters > 0 ? '#C4B5FD' : '#F3E8FF'
        ),
        hoverBackgroundColor: '#7C3AED',
        borderRadius: 12,
        borderSkipped: false,
        borderWidth: 0,
        barPercentage: 0.6,
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
        backgroundColor: '#1E1238',
        titleColor: '#FFFFFF',
        bodyColor: '#E9D5FF',
        padding: 10,
        cornerRadius: 12,
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
          color: '#6B7280',
          font: {
            size: 11,
            weight: 600 as const,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6',
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            size: 10,
          },
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="w-full h-44">
      <Bar data={chartData} options={options} />
    </div>
  );
};
