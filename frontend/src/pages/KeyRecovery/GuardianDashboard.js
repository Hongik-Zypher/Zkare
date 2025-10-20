import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Button,
    Paper,
    Chip,
    List,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import { Security, Schedule, CheckCircle, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { getKeyRecoveryContract, getGuardians } from '../../utils/contracts';

const GuardianDashboard = ({ currentAccount }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingRequests, setPendingRequests] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (currentAccount) {
            loadPendingRequests();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);

    const loadPendingRequests = async () => {
        setLoading(true);
        setError('');

        try {
            const contract = await getKeyRecoveryContract();
            const provider = new ethers.providers.Web3Provider(window.ethereum, {
                chainId: 31337,
                name: 'localhost',
                ensAddress: null
            });

            // RecoveryRequested 이벤트 필터 생성 (최근 10000 블록)
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            
            const filter = contract.filters.RecoveryRequested();
            const events = await contract.queryFilter(filter, fromBlock, currentBlock);

            console.log('🔍 복구 요청 이벤트 찾기:', events.length);

            // 각 요청에 대해 보호자 여부 확인
            const requests = [];
            for (const event of events) {
                const requestUser = event.args.user;
                const requestId = event.args.requestId;
                const expiryTime = event.args.expiryTime.toNumber();

                try {
                    // 요청자의 보호자 정보 조회
                    const guardianData = await getGuardians(requestUser);
                    
                    // 현재 사용자가 보호자인지 확인
                    const isGuardian = guardianData.addresses.some(addr => 
                        addr.toLowerCase() === currentAccount.toLowerCase()
                    );

                    if (isGuardian) {
                        // 복구 요청 상태 조회
                        const status = await contract.getRecoveryStatus(requestId);
                        
                        // 만료되지 않고, 완료/취소되지 않은 요청만 표시
                        const now = Math.floor(Date.now() / 1000);
                        if (now <= expiryTime && !status.isCompleted && !status.isCancelled) {
                            // 현재 보호자의 응답 상태 확인
                            const response = await contract.getGuardianResponse(requestId, currentAccount);
                            
                            requests.push({
                                requestId: requestId,
                                user: requestUser,
                                timestamp: status.timestamp.toNumber(),
                                expiryTime: expiryTime,
                                approvalCount: status.approvalCount.toNumber(),
                                isCompleted: status.isCompleted,
                                isCancelled: status.isCancelled,
                                hasApproved: response.hasApproved,
                                hasRejected: response.hasRejected,
                                blockNumber: event.blockNumber
                            });
                        }
                    }
                } catch (err) {
                    console.error('요청 처리 오류:', err);
                }
            }

            // 최신 요청이 위로 오도록 정렬
            requests.sort((a, b) => b.blockNumber - a.blockNumber);
            
            console.log('✅ 보호자로 등록된 복구 요청:', requests);
            setPendingRequests(requests);

        } catch (error) {
            console.error('❌ 복구 요청 로드 오류:', error);
            setError('복구 요청을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString('ko-KR');
    };

    const formatTime = (seconds) => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, seconds - now);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        return `${hours}시간 ${minutes}분`;
    };

    const handleApprovalClick = (requestId) => {
        navigate(`/guardian-approval/${requestId}`);
    };

    if (!currentAccount) {
        return (
            <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
                <Alert severity="warning">
                    보호자 대시보드를 사용하려면 먼저 MetaMask를 연결해주세요.
                </Alert>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    복구 요청을 확인하는 중...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Security color="primary" sx={{ mr: 2 }} />
                보호자 대시보드
            </Typography>

            <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                    연결된 보호자 계정
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {currentAccount}
                </Typography>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">
                    승인 대기 중인 복구 요청
                </Typography>
                <Button
                    variant="outlined"
                    onClick={loadPendingRequests}
                    disabled={loading}
                >
                    새로고침
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {pendingRequests.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        승인 대기 중인 요청이 없습니다
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        귀하가 보호자로 등록된 사용자로부터 복구 요청이 오면 여기에 표시됩니다.
                    </Typography>
                </Paper>
            ) : (
                <List>
                    {pendingRequests.map((request, index) => (
                        <React.Fragment key={request.requestId}>
                            <Card sx={{ mb: 2 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box>
                                            <Typography variant="h6" gutterBottom>
                                                키 복구 요청
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                요청 ID: {formatAddress(request.requestId)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            {request.hasApproved && (
                                                <Chip label="승인함" color="success" size="small" />
                                            )}
                                            {request.hasRejected && (
                                                <Chip label="거부함" color="error" size="small" />
                                            )}
                                            {!request.hasApproved && !request.hasRejected && (
                                                <Chip label="대기 중" color="warning" size="small" />
                                            )}
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <List dense>
                                        <ListItem>
                                            <ListItemText
                                                primary="요청자"
                                                secondary={request.user}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText
                                                primary="요청 시간"
                                                secondary={formatDate(request.timestamp)}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText
                                                primary="현재 승인 수"
                                                secondary={`${request.approvalCount} / 2`}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Schedule sx={{ mr: 1 }} color="action" />
                                                <ListItemText
                                                    primary="남은 시간"
                                                    secondary={formatTime(request.expiryTime)}
                                                />
                                            </Box>
                                        </ListItem>
                                    </List>

                                    {!request.hasApproved && !request.hasRejected && (
                                        <Box sx={{ mt: 2 }}>
                                            <Alert severity="warning" sx={{ mb: 2 }}>
                                                ⚠️ 요청자에게 직접 연락하여 본인이 맞는지 확인한 후 승인해주세요.
                                            </Alert>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                fullWidth
                                                onClick={() => handleApprovalClick(request.requestId)}
                                            >
                                                승인/거부하기
                                            </Button>
                                        </Box>
                                    )}

                                    {(request.hasApproved || request.hasRejected) && (
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => handleApprovalClick(request.requestId)}
                                            sx={{ mt: 2 }}
                                        >
                                            상세 정보 보기
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </React.Fragment>
                    ))}
                </List>
            )}

            <Paper sx={{ p: 3, mt: 4, backgroundColor: '#f0f7ff' }}>
                <Typography variant="h6" gutterBottom>
                    📌 보호자 역할 안내
                </Typography>
                <Typography variant="body2" component="div">
                    <ul>
                        <li>보호자로 등록된 사용자가 개인키를 분실했을 때 복구를 도와주는 역할입니다.</li>
                        <li>3명의 보호자 중 2명의 승인이 있어야 키 복구가 가능합니다.</li>
                        <li>복구 요청이 오면 반드시 요청자에게 <strong>직접 연락</strong>하여 본인이 맞는지 확인하세요.</li>
                        <li>승인 후에는 취소할 수 없으니 신중하게 결정해주세요.</li>
                        <li>복구 요청은 24시간 내에 처리해야 합니다.</li>
                    </ul>
                </Typography>
            </Paper>
        </Box>
    );
};

export default GuardianDashboard;

