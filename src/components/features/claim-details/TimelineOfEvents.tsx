import { TimelineEvent } from "@/app/types/dispute";
import { Clock } from "lucide-react";

export const TimelineOfEvents = ({ events }: { events: TimelineEvent[] }) => {
  return (
    <div className="bg-[#13141b] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center space-x-2 text-white font-medium mb-6">
        <Clock size={18} />
        <h2>Timeline of Events</h2>
      </div>
      <div className="relative pl-3 space-y-6">
        {/* Vertical Line */}
        <div className="absolute left-3.75 top-2 bottom-2 w-0.5 bg-gray-800"></div>
        
        {events.map((event) => (
          <div key={event.id} className="relative flex items-start" >
            <div className={`w-3 h-3 rounded-full mt-1.5 mr-4 z-10 ${event.isRecent ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
            <div>
              <p className="text-sm font-medium text-gray-200">{event.title}</p>
              <div className="text-xs text-gray-500 flex space-x-2 mt-1">
                <span>{event.timeAgo}</span>
                <span>·</span>
                <span>{event.actor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};