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
    labels: data.map((d) => d.shortMonth.toUpperCase()),
    datasets: [
      {
        label: 'Capítulos por mes',
        data: data.map((d) => d.chapters),
        backgroundColor: data.map((d) =>
          d.chapters > 0 ? '#C8B6E2' : '#F0EBE1'
        ),
        hoverBackgroundColor: '#8F7BB5',
        borderRadius: 16,
        borderSkipped: false,
        borderColor: '#2D2926',
        borderWidth: 1.5,
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
        backgroundColor: '#FFFFFF',
        titleColor: '#242220',
        bodyColor: '#5C5651',
        borderColor: '#2D2926',
        borderWidth: 1.5,
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
          color: '#5C5651',
          font: {
            size: 10,
            weight: 700 as const,
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(45, 41, 38, 0.08)',
        },
        ticks: {
          color: '#8A847E',
          font: {
            size: 10,
            weight: 600 as const,
          },
        },
        border: {
          dash: [4, 4],
          display: false,
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
