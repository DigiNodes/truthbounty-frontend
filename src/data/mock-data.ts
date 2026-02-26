import { ClaimData, Evidence, TimelineEvent, TopVerifier } from "@/app/types/dispute";


export const claimData: ClaimData = {
  id: '1',
  category: 'Climate',
  hash: '0x1a2b ... 3c4d',
  status: 'Verified',
  title: 'Global average temperatures increased by 1.1°C since pre-industrial times',
  source: 'IPCC Report 2023',
  timeAgo: '2h ago',
  votesFor: 8432,
  votesAgainst: 234,
  verifiersCount: 847,
  confidenceScore: 97,
  totalStaked: 45200,
};

export const evidences: Evidence[] =[
  { id: '1', title: 'IPCC AR6 Synthesis Report', description: 'Primary Source', url: '#' },
  { id: '2', title: 'NASA Climate Data', description: 'Supporting Data', url: '#' },
  { id: '3', title: 'Peer Review Analysis', description: 'Verification', url: '#' },
];

export const timelineEvents: TimelineEvent[] =[
  { id: '1', title: 'Claim Submitted', timeAgo: '2 days ago', actor: '0x7a8b...9c0d', isRecent: false },
  { id: '2', title: 'First Verification', timeAgo: '1 day ago', actor: 'Academic Consortium', isRecent: false },
  { id: '3', title: 'Stake Threshold Reached', timeAgo: '18 hours ago', actor: 'System', isRecent: false },
  { id: '4', title: 'Community Voting Started', timeAgo: '12 hours ago', actor: 'System', isRecent: true },
];

export const topVerifiers: TopVerifier[] =[
  { id: '1', rank: 1, name: 'Academic Consortium', staked: '$12,400', score: 98.2 },
  { id: '2', rank: 2, name: 'News Alliance', staked: '$8,200', score: 96.8 },
  { id: '3', rank: 3, name: 'Data Science Labs', staked: '$6,100', score: 97.5 },
];

export const activityData = [
  { name: "Mon", verified: 40, disputed: 24, false: 10 },
  { name: "Tue", verified: 30, disputed: 13, false: 5 },
  { name: "Wed", verified: 20, disputed: 58, false: 12 },
  { name: "Thu", verified: 27, disputed: 39, false: 8 },
  { name: "Fri", verified: 18, disputed: 48, false: 6 },
  { name: "Sat", verified: 23, disputed: 38, false: 4 },
  { name: "Sun", verified: 34, disputed: 43, false: 9 },
];

export const verificationNodes = [
  { name: "Validator #1", status: "Online", uptime: "99.9%", location: "US-East" },
  { name: "Validator #2", status: "Online", uptime: "99.5%", location: "EU-West" },
  { name: "Validator #3", status: "Maintenance", uptime: "98.2%", location: "Asia-East" },
  { name: "Validator #4", status: "Online", uptime: "99.8%", location: "US-West" },
];

export const activeClaims = [
  {
    category: "Climate",
    impact: "High Impact",
    title: "Global average temperatures increased by 1.1°C since pre-industrial times",
    source: "IPCC Report 2023",
    status: "Verified",
    confidence: "97%",
    votes: "8,432",
    stake: "$45,200",
    time: "2h ago",
    actions: "View",
  },
  {
    category: "Health",
    impact: "High Impact",
    title: "New vaccine shows 95% efficacy in Phase 3 trials",
    source: "Nature Medicine",
    status: "Verified",
    confidence: "94%",
    votes: "6,721",
    stake: "$38,600",
    time: "9h ago",
    actions: "View",
  },
  {
    category: "Technology",
    impact: "High Impact",
    title: "Tech company achieved quantum supremacy milestone",
    source: "Press Release",
    status: "Under Review",
    confidence: "Pending",
    votes: "1,243",
    stake: "$16,800",
    time: "2d 4h",
    actions: "Vote",
  },
];

export const platformStats = [
  { label: "Claims", value: "12,847" },
  { label: "Verifications", value: "9,234" },
  { label: "Votes Cast", value: "847,291" },
  { label: "Unique Verifiers", value: "4,128" },
  { label: "TVL", value: "$2.4M" },
  { label: "Chains", value: "7" },
];
