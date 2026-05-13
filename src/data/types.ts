// Case status options
export type CaseStatus = 'Active' | 'Closed' | 'Dismissed' | 'Deleted';

// Access class options
export type AccessClass = 'Unrestricted' | 'Restricted' | 'Confidential' | 'Secret';

// Evidence status options
export type EvidenceStatus = 'active' | 'deleted' | 'queued for deletion' | 'archived' | 'under review';

// Evidence file type options
export type FileType = 'video' | 'audio' | 'image' | 'zip' | 'other';

// Incident category options
export type Category = 'Assault' | 'Traffic Stop' | 'Homicide' | 'Theft' | 'Shooting' | 'Domestic' | 'Drug Offense' | 'Burglary' | 'Police Event' | 'Non Event' | 'Other';

// Case interface with all required metadata
export interface Case {
  caseId: string;
  owner: string;
  createdOn: Date;
  lastUpdatedOn: Date;
  status: CaseStatus;
  description: string;
  accessClass: AccessClass;
  isShared?: boolean; // Indicates if the case has been shared with partners
}

// Evidence interface with all required metadata
export interface Evidence {
  uuid: string; // Unique identifier for each evidence entry
  id: string;   // Case ID this evidence belongs to
  title: string;
  owner: string;
  uploadedBy: string;
  addedBy: string;
  uploadedOn: Date;
  recordedOn: Date;
  duration: string; // Format: "HH:MM:SS" or "N/A" for non-video content
  status: EvidenceStatus;
  fileType: FileType;
  category: Category;
  thumbnailUrl: string;
  location?: string;
  description?: string;
  source?: string;
  vector_file_id?: string;
  objects_detected?: ObjectDetected[];
}

// Detected object from vision analysis
export interface ObjectDetected {
  label: string;
  color: string | null;
  confidence: 'high' | 'medium' | 'low';
  position: string;
  count: number;
}

// --- Agentic engine types ---

export type MediaClass = 'video' | 'audio' | 'image' | 'document' | 'text' | 'pdf';

export interface GraphNode {
  id: string;
  title: string;
  media_class: MediaClass;
  mime_type: string;
  size: number;
  case_id: string;
  date_recorded: string;
  date_ingested: string;
  officer: string;
  category: string;
  source?: string;
  duration?: string | null;
  status: string;
  description?: string;
  objects_detected: ObjectDetected[];
  scene_type?: string;
  lighting?: string;
  people_count?: number;
  text_visible?: string;
  vector_file_id?: string;
  tags?: string[];
  video_processing?: string | null;
  thumbnailUrl?: string;
  fileUrl?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: 'same_case' | 'same_officer' | 'same_date' | 'referenced_in';
  metadata?: Record<string, unknown>;
}

export interface CaseGraphMetadata {
  title: string;
  status: string;
  lead_officer: string;
  evidence_ids: string[];
  date_opened: string;
}

export interface ContextGraph {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
  cases: Record<string, CaseGraphMetadata>;
  metadata: {
    total_items: number;
    last_updated: string;
    media_breakdown: Record<string, number>;
  };
}

// Search engine output types
export type FilterChipType = 'officer' | 'date' | 'category' | 'file_type' | 'case' | 'location' | 'object';

export interface FilterChip {
  id: string;
  type: FilterChipType;
  label: string;
  value: string;
}

export type EntityResultType = 'case' | 'officer';

export interface EntityResult {
  type: EntityResultType;
  id: string;
  name: string;
  subtitle: string;
}

export interface SearchEvidenceResult {
  evidence_id: string;
  title: string;
  media_class: MediaClass;
  case_id: string;
  officer: string;
  category: string;
  relevance: string;
  excerpt?: string;
  confidence: 'high' | 'medium' | 'low';
  thumbnailUrl?: string;
  fileUrl?: string;
  objects_matched?: ObjectDetected[];
  related_evidence?: string[];
  date_recorded?: string;
  source?: string;
}

export interface SearchOutput {
  summary: string;
  results: SearchEvidenceResult[];
  entities: EntityResult[];
  chips: FilterChip[];
  suggestions: string[];
  graph_context: {
    cases_involved: string[];
    total_scoped: number;
    total_matched: number;
  };
}

// ─── Agentic actions ─────────────────────────────────────────────────────────

export type AgentActionType = 'set_category' | 'set_status' | 'add_tag' | 'add_to_case';

export interface AgentAction {
  type: AgentActionType;
  item_ids: string[];
  value: string;
}

// ─── Metadata edits ──────────────────────────────────────────────────────────

export interface MetadataEdit {
  id: string;
  evidence_id: string;
  evidence_ids?: string[];
  evidence_title?: string;
  field: string;
  current_value?: string;
  new_value: string;
  status: 'pending' | 'applied' | 'dismissed';
}

// Sharing policy options
export type SharingPolicy = 'default' | 'share with Police' | 'share with attorneys';

// Share type options
export type ShareType = 'entire case' | 'list of evidence' | 'folder share';

// Partner user interface
export interface PartnerUser {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  shareType: ShareType;
}

// Partner interface
export interface Partner {
  id: string;
  name: string;
  users: PartnerUser[];
  sharingPolicy: SharingPolicy;
  hasDefaultUser: boolean;
  defaultUser?: PartnerUser; // Only present when hasDefaultUser is true
}