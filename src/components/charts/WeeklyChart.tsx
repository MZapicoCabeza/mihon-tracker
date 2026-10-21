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
  accentColor?: 'green' | 'coral' | 'purple';
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data, accentColor = 'green' }) => {
  const getColors = () => {
    switch (accentColor) {
      case 'coral':
        return {
          bar: '#F6A596',
          highlight: '#E27D60',
          border: '#2D2926',
        };
      case 'purple':
        return {
          bar: '#C8B6E2',
          highlight: '#9B84C4',
          border: '#2D2926',
        };
      default:
        return {
          bar: '#A8D5BA',
          highlight: '#78B890',
          border: '#2D2926',
        };
    }
  };

  const colors = getColors();

  const chartData = {
    labels: data.map((d) => d.shortDay.toUpperCase()),
    datasets: [
      {
        label: 'Capítulos leídos',
        data: data.map((d) => d.chapters),
        backgroundColor: data.map((d, idx) =>
          idx === data.length - 1 || d.chapters >= 12 ? colors.highlight : colors.bar
        ),
        hoverBackgroundColor: '#2D2926',
        borderRadius: 24,
        borderSkipped: false,
        borderColor: colors.border,
        borderWidth: 1.5,
        barPercentage: 0.65,
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
          color: '#5C5651',
          font: {
            size: 11,
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
          stepSize: 4,
        },
        border: {
          dash: [4, 4],
          display: false,
        },
      },
    },
  };

  return (
    <div style={{ height: '190px', width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};
