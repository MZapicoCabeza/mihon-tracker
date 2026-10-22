import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface GenreDonutChartProps {
  data: { genre: string; count: number; percentage: number; color: string }[];
}

export const GenreDonutChart: React.FC<GenreDonutChartProps> = ({ data }) => {
  const modernPalette = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#A855F7'];

  const chartData = {
    labels: data.map((d) => d.genre),
    datasets: [
      {
        data: data.map((d) => d.percentage),
        backgroundColor: data.map((_, i) => modernPalette[i % modernPalette.length]),
        borderColor: '#FFFFFF',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
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
        callbacks: {
          label: (context: any) =>
            ` ${context.label}: ${context.raw}% (${data[context.dataIndex]?.count || 0} caps)`,
        },
      },
    },
  };

  const topGenre = data[0] || { genre: 'Romance', percentage: 32 };

  return (
    <div style={{ height: '190px', position: 'relative', width: '100%' }}>
      <Doughnut data={chartData} options={options} />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <span className="text-xl font-black text-[#1E1238] block leading-none">
          {topGenre.percentage}%
        </span>
        <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider block mt-1">
          {topGenre.genre}
        </span>
      </div>
    </div>
  );
};
