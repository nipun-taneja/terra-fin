export function CreditTimeline() {
  const months = ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26'];
  const values = [0, 0, 0, 0, 992];

  const maxValue = Math.max(...values);

  return (
    <div className="w-full h-24">
      <div className="flex items-end justify-between h-full gap-2">
        {months.map((month, index) => {
          const height = maxValue > 0 ? (values[index] / maxValue) * 100 : 0;
          return (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-stone-100 rounded-t relative" style={{ height: '60px' }}>
                <div 
                  className="absolute bottom-0 w-full bg-emerald-500 rounded-t transition-all"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-500">{month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
