import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface GenreDonutChartProps {
  data: { genre: string; count: number; percentage: number; color: string }[];
}

export const GenreDonutChart: React.FC<GenreDonutChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map((d) => d.genre),
    datasets: [
      {
        data: data.map((d) => d.percentage),
        backgroundColor: data.map((d) => d.color),
        borderColor: '#131024',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
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
        callbacks: {
          label: (context: any) => ` ${context.label}: ${context.raw}% (${data[context.dataIndex].count} caps)`,
        },
      },
    },
  };

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
        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Top Género
        </span>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#f3e8ff' }}>
          {data[0]?.genre || 'Shonen'}
        </div>
        <div style={{ fontSize: '11px', color: '#a855f7', fontWeight: 700 }}>
          {data[0]?.percentage || 52}%
        </div>
      </div>
    </div>
  );
};
