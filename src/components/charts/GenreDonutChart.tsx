import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface GenreDonutChartProps {
  data: { genre: string; count: number; percentage: number; color: string }[];
}

export const GenreDonutChart: React.FC<GenreDonutChartProps> = ({ data }) => {
  // Soft pastel colors inspired by reference images
  const pastelPalette = ['#97CAA8', '#F6A596', '#C8B6E2', '#F8C866', '#B5E2FA'];

  const chartData = {
    labels: data.map((d) => d.genre),
    datasets: [
      {
        data: data.map((d) => d.percentage),
        backgroundColor: data.map((_, i) => pastelPalette[i % pastelPalette.length]),
        borderColor: '#2D2926',
        borderWidth: 2,
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
        backgroundColor: '#FFFFFF',
        titleColor: '#242220',
        bodyColor: '#5C5651',
        borderColor: '#2D2926',
        borderWidth: 1.5,
        padding: 10,
        cornerRadius: 12,
        callbacks: {
          label: (context: any) =>
            ` ${context.label}: ${context.raw}% (${data[context.dataIndex].count} caps)`,
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
        <span
          style={{
            fontSize: '11px',
            color: '#7A746E',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 700,
          }}
        >
          Top Género
        </span>
        <div style={{ fontSize: '17px', fontWeight: 800, color: '#242220' }}>
          {data[0]?.genre || 'Shonen'}
        </div>
        <div style={{ fontSize: '12px', color: '#567D65', fontWeight: 800 }}>
          {data[0]?.percentage || 52}%
        </div>
      </div>
    </div>
  );
};
