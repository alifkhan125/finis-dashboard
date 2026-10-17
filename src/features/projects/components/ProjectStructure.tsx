import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Layers, Box, Home, Plus, CheckSquare, Clock, MapPinned, LayoutGrid } from 'lucide-react';
import type { Floor } from '@/shared/types';

interface ProjectStructureProps {
  projectType?: 'apartment_building' | 'house';
  initialFloors?: Floor[];
  analysisData?: any;
}

export function ProjectStructure({ projectType = 'apartment_building', initialFloors = [], analysisData }: ProjectStructureProps) {
  const isHouse = projectType === 'house';
  const sectionsLabel = isHouse ? 'Sections' : 'Floors';
  const structureLabel = isHouse ? 'House' : 'Building';
  const locationLabel = isHouse ? 'Sections' : 'Units';

  const checklist = analysisData?.checklist ?? [];
  const hasAnalysis = checklist.length > 0;
  const displayFloors = hasAnalysis ? checklist : initialFloors;

  const totalFloors = displayFloors.length;
  
  const totalRooms = hasAnalysis
    ? checklist.reduce((sum: number, item: any) => sum + (item.totalUnits ?? item.rooms?.length ?? 0), 0)
    : initialFloors.reduce((sum, floor) => sum + (floor.totalRooms ?? floor.rooms?.length ?? 0), 0);

  const totalTasks = displayFloors.reduce((sum: number, floor: any) => {
    const roomsTaskSum = floor.rooms?.reduce((rSum: number, r: any) => rSum + (r.taskCounts?.total ?? r.tasks?.length ?? 0), 0) ?? 0;
    const floorTotal = floor.taskCounts?.total ?? (roomsTaskSum || floor.tasks?.length || 0);
    return sum + floorTotal;
  }, 0);

  const completedTasks = displayFloors.reduce((sum: number, floor: any) => {
    const roomsCompletedSum = floor.rooms?.reduce((rSum: number, r: any) => rSum + (r.taskCounts?.completed ?? r.tasks?.filter((t: any) => t.status === 'completed' || t.isCompleted).length ?? 0), 0) ?? 0;
    const floorCompleted = floor.taskCounts?.completed ?? (roomsCompletedSum || floor.tasks?.filter((t: any) => t.status === 'completed' || t.isCompleted).length || 0);
    return sum + floorCompleted;
  }, 0);
      
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1D4F6D]">
                <LayoutGrid className="h-3.5 w-3.5" />
                {structureLabel} Overview
              </div>
              <h3 className="text-2xl font-black text-gray-900">
                {isHouse ? 'House structure' : 'Building structure'}
              </h3>
              <p className="max-w-2xl text-sm text-gray-500">
                This section shows how the project is broken down into {sectionsLabel.toLowerCase()}, units, and sub-task progress.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total {sectionsLabel}</p>
                <p className="mt-2 text-2xl font-black text-gray-900">{totalFloors}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{locationLabel}</p>
                <p className="mt-2 text-2xl font-black text-gray-900">{totalRooms}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sub-Tasks</p>
                <p className="mt-2 text-2xl font-black text-gray-900">{totalTasks}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Progress</p>
                <p className="mt-2 text-2xl font-black text-green-600">{overallProgress}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2 text-[#1D4F6D]">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 tracking-widest">Structure Type</p>
                <p className="text-sm font-bold text-gray-900">{structureLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-50 p-2 text-green-600">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 tracking-widest">Completed</p>
                <p className="text-sm font-bold text-gray-900">{completedTasks} sub-tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <MapPinned className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 tracking-widest">Structure Health</p>
                <p className="text-sm font-bold text-gray-900">
                  {totalTasks > 0 ? `${totalTasks} sub-tasks tracked` : 'No sub-tasks yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {displayFloors.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50/40">
          <CardContent className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm">
              <Layers className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No structure found</h3>
            <p className="mt-2 text-sm text-gray-500">
              This project has no floors or sections yet. Create them from the project setup flow.
            </p>
            <Button className="mt-6 bg-[#1D4F6D] hover:bg-[#163d56]">
              <Plus className="h-4 w-4 mr-2" />
              Add Structure
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayFloors.map((item: any, index: number) => {
            const floor = item;
            
            const roomCount = hasAnalysis ? (item.totalUnits ?? item.rooms?.length ?? 0) : (floor.totalRooms ?? floor.rooms?.length ?? 0);
            
            const roomsTaskSum = floor.rooms?.reduce((sum: number, room: any) => sum + (room.taskCounts?.total ?? room.tasks?.length ?? 0), 0) ?? 0;
            const roomsCompletedSum = floor.rooms?.reduce((sum: number, room: any) => sum + (room.taskCounts?.completed ?? room.tasks?.filter((task: any) => task.status === 'completed' || task.isCompleted).length ?? 0), 0) ?? 0;

            const taskCount = floor.taskCounts?.total ?? (roomsTaskSum || floor.tasks?.length || 0);
            const completed = floor.taskCounts?.completed ?? (roomsCompletedSum || floor.tasks?.filter((task: any) => task.status === 'completed' || task.isCompleted).length || 0);
            const floorProgress = taskCount > 0 ? Math.round((completed / taskCount) * 100) : (floor.progress ?? 0);

            const floorId = item.floorId || item.id || `floor-${index}`;
            const floorName = item.floorName || item.name;

            return (
              <Card key={floorId} className="border-gray-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                        {isHouse ? <Home className="h-5 w-5 text-purple-600" /> : <Box className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-gray-900">
                          {floorName || `${isHouse ? 'Section' : 'Floor'} ${index + 1}`}
                        </CardTitle>
                        <p className="text-xs text-gray-500">
                          {roomCount} {locationLabel.toLowerCase()} • {taskCount} sub-tasks
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      {floorProgress}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{locationLabel}</p>
                      <p className="text-xl font-black text-gray-900">{roomCount}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Sub-Tasks</p>
                      <p className="text-xl font-black text-gray-900">{taskCount}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Completed</p>
                      <p className="text-xl font-black text-green-600">{completed}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                        <span>Progress</span>
                        <span>{floorProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#1D4F6D] to-green-500"
                          style={{ width: `${floorProgress}%` }}
                        />
                      </div>
                    </div>

                    {floor.rooms && floor.rooms.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{locationLabel}</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {floor.rooms.map((room: any) => {
                            const roomTasks = room.taskCounts?.total ?? room.tasks?.length ?? 0;
                            const roomCompleted = room.taskCounts?.completed ?? room.tasks?.filter((task: any) => task.status === 'completed' || task.isCompleted).length ?? 0;
                            const roomProgress = roomTasks > 0 ? Math.round((roomCompleted / roomTasks) * 100) : (room.progress ?? 0);

                            return (
                              <div key={room.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">{room.name || 'Unnamed Unit'}</p>
                                    <p className="text-xs text-gray-500">{room.type || 'Unit'}</p>
                                  </div>
                                  <Badge variant="secondary" className="bg-blue-50 text-[#1D4F6D]">
                                    {roomTasks} sub-tasks
                                  </Badge>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Completion</span>
                                    <span>{roomProgress}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-gray-100">
                                    <div
                                      className="h-full rounded-full bg-green-500"
                                      style={{ width: `${roomProgress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
