import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskAssignmentRequest {
  farm_id: string;
  task_type: 'planting' | 'harvesting' | 'irrigation' | 'fertilization' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string;
  estimated_duration?: number; // hours
  required_skills?: string[];
  equipment_required?: string[];
}

interface TaskAssignment {
  task_id: string;
  assigned_to: string;
  assigned_worker: {
    id: string;
    name: string;
    skills: string[];
    availability: string;
  };
  assignment_score: number;
  reasoning: string[];
  alternative_assignments: {
    worker_id: string;
    worker_name: string;
    score: number;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { farm_id, task_type, priority, scheduled_date, estimated_duration, required_skills, equipment_required }: TaskAssignmentRequest = await req.json();

    // Get farm data
    const { data: farm } = await supabase
      .from('farms')
      .select('id, name, organization_id')
      .eq('id', farm_id)
      .single();

    if (!farm) {
      throw new Error('Farm not found');
    }

    // Get available workers
    const { data: workers } = await supabase
      .from('employees')
      .select(`
        id, name, skills, hourly_rate, availability_status,
        work_records!inner(farm_id, work_date, hours_worked)
      `)
      .eq('farm_id', farm_id)
      .eq('is_active', true);

    // Get day laborers
    const { data: dayLaborers } = await supabase
      .from('day_laborers')
      .select('id, name, skills, hourly_rate, availability_status')
      .eq('farm_id', farm_id)
      .eq('is_active', true);

    // Get equipment availability
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, name, type, status, maintenance_due')
      .eq('farm_id', farm_id)
      .eq('is_active', true);

    // Get existing tasks for the scheduled date
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('assigned_to, estimated_duration')
      .eq('farm_id', farm_id)
      .eq('scheduled_date', scheduled_date)
      .in('status', ['pending', 'in_progress']);

    // Combine all workers
    const allWorkers = [
      ...(workers || []).map(w => ({ ...w, type: 'employee' })),
      ...(dayLaborers || []).map(d => ({ ...d, type: 'day_laborer' }))
    ];

    // Find best assignment
    const taskAssignment = findBestTaskAssignment({
      taskType: task_type,
      priority,
      scheduledDate: scheduled_date,
      estimatedDuration: estimated_duration || 8,
      requiredSkills: required_skills || [],
      equipmentRequired: equipment_required || [],
      availableWorkers: allWorkers,
      availableEquipment: equipment || [],
      existingTasks: existingTasks || []
    });

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        farm_id,
        task_type,
        title: `${task_type.charAt(0).toUpperCase() + task_type.slice(1)} Task`,
        description: `Automated ${task_type} task assignment`,
        scheduled_date,
        estimated_duration: estimated_duration || 8,
        assigned_to: taskAssignment.assigned_to,
        priority,
        status: 'pending',
        required_skills: required_skills || [],
        equipment_required: equipment_required || [],
        assignment_score: taskAssignment.assignment_score,
        assignment_reasoning: taskAssignment.reasoning
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return new Response(
      JSON.stringify({
        success: true,
        task_assignment: {
          ...taskAssignment,
          task_id: task.id
        },
        task_info: {
          id: task.id,
          type: task.task_type,
          priority: task.priority,
          scheduled_date: task.scheduled_date
        },
        farm_info: {
          name: farm.name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function findBestTaskAssignment(params: {
  taskType: string;
  priority: string;
  scheduledDate: string;
  estimatedDuration: number;
  requiredSkills: string[];
  equipmentRequired: string[];
  availableWorkers: any[];
  availableEquipment: any[];
  existingTasks: any[];
}): TaskAssignment {
  const { taskType, priority, scheduledDate, estimatedDuration, requiredSkills, equipmentRequired, availableWorkers, availableEquipment, existingTasks } = params;
  
  // Score each worker
  const workerScores = availableWorkers.map(worker => {
    const score = calculateWorkerScore({
      worker,
      taskType,
      priority,
      scheduledDate,
      estimatedDuration,
      requiredSkills,
      equipmentRequired,
      availableEquipment,
      existingTasks
    });
    
    return {
      worker,
      score: score.total,
      reasoning: score.reasoning,
      breakdown: score.breakdown
    };
  });
  
  // Sort by score (highest first)
  workerScores.sort((a, b) => b.score - a.score);
  
  const bestWorker = workerScores[0];
  const alternativeAssignments = workerScores.slice(1, 4).map(w => ({
    worker_id: w.worker.id,
    worker_name: w.worker.name,
    score: w.score
  }));
  
  return {
    task_id: '', // Will be set after task creation
    assigned_to: bestWorker.worker.id,
    assigned_worker: {
      id: bestWorker.worker.id,
      name: bestWorker.worker.name,
      skills: bestWorker.worker.skills || [],
      availability: bestWorker.worker.availability_status || 'available'
    },
    assignment_score: bestWorker.score,
    reasoning: bestWorker.reasoning,
    alternative_assignments: alternativeAssignments
  };
}

function calculateWorkerScore(params: {
  worker: any;
  taskType: string;
  priority: string;
  scheduledDate: string;
  estimatedDuration: number;
  requiredSkills: string[];
  equipmentRequired: string[];
  availableEquipment: any[];
  existingTasks: any[];
}): { total: number; reasoning: string[]; breakdown: any } {
  const { worker, taskType, priority, scheduledDate, estimatedDuration, requiredSkills, equipmentRequired, availableEquipment, existingTasks } = params;
  
  const reasoning: string[] = [];
  const breakdown: any = {};
  
  let totalScore = 0;
  
  // Skill matching (40% weight)
  const skillScore = calculateSkillScore(worker.skills || [], requiredSkills);
  totalScore += skillScore * 0.4;
  breakdown.skill_score = skillScore;
  reasoning.push(`Skill match: ${(skillScore * 100).toFixed(0)}%`);
  
  // Availability (25% weight)
  const availabilityScore = calculateAvailabilityScore(worker, scheduledDate, estimatedDuration, existingTasks);
  totalScore += availabilityScore * 0.25;
  breakdown.availability_score = availabilityScore;
  reasoning.push(`Availability: ${(availabilityScore * 100).toFixed(0)}%`);
  
  // Experience with task type (20% weight)
  const experienceScore = calculateExperienceScore(worker, taskType);
  totalScore += experienceScore * 0.2;
  breakdown.experience_score = experienceScore;
  reasoning.push(`Experience: ${(experienceScore * 100).toFixed(0)}%`);
  
  // Cost efficiency (10% weight)
  const costScore = calculateCostScore(worker, priority);
  totalScore += costScore * 0.1;
  breakdown.cost_score = costScore;
  reasoning.push(`Cost efficiency: ${(costScore * 100).toFixed(0)}%`);
  
  // Equipment compatibility (5% weight)
  const equipmentScore = calculateEquipmentScore(worker, equipmentRequired, availableEquipment);
  totalScore += equipmentScore * 0.05;
  breakdown.equipment_score = equipmentScore;
  reasoning.push(`Equipment compatibility: ${(equipmentScore * 100).toFixed(0)}%`);
  
  return {
    total: Math.round(totalScore * 100) / 100,
    reasoning,
    breakdown
  };
}

function calculateSkillScore(workerSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 1.0;
  
  const matchingSkills = requiredSkills.filter(skill => 
    workerSkills.some(ws => ws.toLowerCase().includes(skill.toLowerCase()))
  );
  
  return matchingSkills.length / requiredSkills.length;
}

function calculateAvailabilityScore(worker: any, scheduledDate: string, estimatedDuration: number, existingTasks: any[]): number {
  // Check if worker is available
  if (worker.availability_status !== 'available') {
    return 0.2; // Low score for unavailable workers
  }
  
  // Check existing workload
  const workerExistingTasks = existingTasks.filter(task => task.assigned_to === worker.id);
  const existingWorkload = workerExistingTasks.reduce((sum, task) => sum + (task.estimated_duration || 0), 0);
  
  if (existingWorkload + estimatedDuration > 10) { // More than 10 hours
    return 0.3; // Low score for overworked
  } else if (existingWorkload + estimatedDuration > 8) { // More than 8 hours
    return 0.7; // Medium score
  }
  
  return 1.0; // High score for available workers
}

function calculateExperienceScore(worker: any, taskType: string): number {
  const skills = worker.skills || [];
  
  // Check for direct experience
  if (skills.some((skill: string) => skill.toLowerCase().includes(taskType.toLowerCase()))) {
    return 1.0;
  }
  
  // Check for related experience
  const relatedSkills = getRelatedSkills(taskType);
  const hasRelatedSkills = skills.some((skill: string) => 
    relatedSkills.some(related => skill.toLowerCase().includes(related.toLowerCase()))
  );
  
  return hasRelatedSkills ? 0.7 : 0.4;
}

function getRelatedSkills(taskType: string): string[] {
  const skillMap: Record<string, string[]> = {
    'planting': ['seeding', 'cultivation', 'soil preparation'],
    'harvesting': ['picking', 'collection', 'post-harvest'],
    'irrigation': ['watering', 'water management', 'pumping'],
    'fertilization': ['nutrient management', 'soil amendment', 'spreading'],
    'maintenance': ['repair', 'cleaning', 'equipment', 'general']
  };
  
  return skillMap[taskType] || [];
}

function calculateCostScore(worker: any, priority: string): number {
  const hourlyRate = worker.hourly_rate || 15; // Default rate
  
  // For urgent tasks, prioritize effectiveness over cost
  if (priority === 'urgent') {
    return hourlyRate < 20 ? 0.8 : 1.0; // Prefer experienced workers
  }
  
  // For other priorities, consider cost efficiency
  if (hourlyRate < 12) return 1.0; // Very cost effective
  if (hourlyRate < 18) return 0.8; // Cost effective
  if (hourlyRate < 25) return 0.6; // Moderate cost
  return 0.4; // Expensive
}

function calculateEquipmentScore(worker: any, equipmentRequired: string[], availableEquipment: any[]): number {
  if (equipmentRequired.length === 0) return 1.0;
  
  // Check if required equipment is available
  const availableEquipmentTypes = availableEquipment
    .filter(eq => eq.status === 'available')
    .map(eq => eq.type);
  
  const availableRequired = equipmentRequired.filter(req => 
    availableEquipmentTypes.some(type => type.toLowerCase().includes(req.toLowerCase()))
  );
  
  return availableRequired.length / equipmentRequired.length;
}
