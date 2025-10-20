import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';
import { Security } from '@mui/icons-material';
import GuardianApproval from '../../components/KeyRecovery/GuardianApproval';

const GuardianApprovalPage = ({ currentAccount }) => {
    const { requestId } = useParams();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // URL에서 requestId 가져오기 (params 또는 query string)
    const finalRequestId = requestId || searchParams.get('requestId');

    useEffect(() => {
        // 페이지 로드 완료
        setLoading(false);
    }, []);

    if (!currentAccount) {
        return (
            <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
                <Alert severity="warning">
                    보호자 승인을 하려면 먼저 MetaMask를 연결해주세요.
                </Alert>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <GuardianApproval 
                currentAccount={currentAccount}
                requestId={finalRequestId}
            />
        </Box>
    );
};

export default GuardianApprovalPage;


