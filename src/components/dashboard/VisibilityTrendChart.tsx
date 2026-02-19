import { VisibilityTrendPoint } from '@/types/rufus';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface VisibilityTrendChartProps {
  data: VisibilityTrendPoint[];
}

export function VisibilityTrendChart({ data }: VisibilityTrendChartProps) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="visGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(215, 35%, 55%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(215, 35%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(214, 20%, 88%)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value: number) => [`${value}`, 'Score']}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(215, 35%, 55%)"
            strokeWidth={2}
            fill="url(#visGradient)"
            dot={{ r: 4, fill: 'hsl(215, 35%, 55%)', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'hsl(215, 35%, 55%)', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
