import React from 'react';
import logo from '@/assets/logo.png';

const Index: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Warning banner */}
      <div className="bg-accent/30 border-b border-accent/50 px-4 py-2">
        <p className="text-xs text-accent-foreground text-center">
          ⚠️ 温馨提示：本平台仅提供信息展示，不参与实际交易。请交易双方当面验货，注意交易安全。
        </p>
      </div>

      {/* Placeholder content - will be built in batch 2 */}
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <img src={logo} alt="飞呀飞" className="h-24 w-24 rounded-3xl mb-6 shadow-lg" />
        <h2 className="text-2xl font-bold text-foreground mb-2">飞呀飞</h2>
        <p className="text-muted-foreground mb-1">社区二手物品交易平台</p>
        <p className="text-sm text-muted-foreground">聚焦家长互助，学生物品循环利用</p>
      </div>
    </div>
  );
};

export default Index;
