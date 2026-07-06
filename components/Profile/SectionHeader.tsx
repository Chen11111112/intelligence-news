import { Settings, Zap } from "lucide-react";

import { useUserSettings } from '@/hooks/useUserSettings';

import { getDailyAILimit } from '@/lib/user';



interface Props {

  icon: React.ReactNode;

  title: string;

  onViewMore?: () => void;

  showAiUsage?: boolean;

  setIsExamSettingsOpen?: (e: boolean) => void;

}



export default function SectionHeader({

  icon,

  title,

  onViewMore,

  showAiUsage,

  setIsExamSettingsOpen,

}: Props) {

  const { settings } = useUserSettings();

  const aiLimit = getDailyAILimit();

  const aiUsed = settings?.aiUsage.articleIds.length ?? 0;

  const aiLimitLabel = `${aiUsed}/${aiLimit} 篇（今日）`;



  return (

    <div className="flex items-center gap-2 pb-4 border-b ui-divider w-full">

      {icon}



      <div className="flex items-center justify-between flex-1">

        <h3 className="text-xl font-bold ui-heading">{title}</h3>



        {title === "新聞分類偏好" && (

          <button

            type="button"

            onClick={onViewMore}

            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"

          >

            查看更多標籤

          </button>

        )}

        {showAiUsage && (

          <p className="text-xs ui-muted flex items-center gap-1.5">

            <Zap size={14} className="text-blue-500" />

            今日 AI 用量：{aiLimitLabel}

          </p>

        )}



        {title === "英文程度設定" && (

          <button

            type="button"

            onClick={() => setIsExamSettingsOpen && setIsExamSettingsOpen(true)}

            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"

          >

            <Settings size={16} />

            點擊設定

          </button>

        )}

      </div>

    </div>

  );

}

