import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { filesApi } from '../../api/filesApi';
import { loyaltyApi } from '../../api/loyaltyApi';
import { orderApprovalApi } from '../../api/orderApprovalApi';
import { orderTimelineApi } from '../../api/orderTimelineApi';
import { serviceCatalogApi } from '../../api/serviceCatalogApi';
import { orderRequestedPartsApi } from '../../api/orderRequestedPartsApi';
import { ordersApi } from '../../api/ordersApi';
import { partsApi } from '../../api/partsApi';
import { EmptyState } from '../../components/EmptyState';
import { EmployeeAvailabilityLookupField } from '../../components/EmployeeAvailabilityLookupField';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import {
  AuthUser,
  ApprovalRequestDTO,
  EmployeeAvailabilitySearchItem,
  FileItem,
  LoyaltyAccount,
  Order,
  OrderPartItem,
  OrderPartsOverviewItem,
  OrderRequestedPartQuote,
  MechanicWorkDraftViewModel,
  OrderStatus,
  OrderTimelineEntryResponseDTO,
  Part,
  ServiceCatalogItemDTO,
  VehicleScopedPartSearchItem
} from '../../types/models';
import { formatMoney } from '../../utils/format';
import { aggregateOverviewItems, AggregatedOrderPartsItem } from '../../utils/orderPartsMapper';
import { getAllowedOrderStatusTargets, getOrderStatusLabel } from '../../utils/orderStatus';
import { hasAnyRole } from '../../utils/roles';
import { getFinancialCapabilities, getOrderDetailSectionsForRole } from '../../domain/crm';
import { OrderDetailsView, OrderFilesSection, OrderFinanceSection, OrderSectionShell, OrderSummarySection } from './components/OrderDetailsView';
import { MechanicWorkspaceSection } from './components/MechanicWorkspaceSection';
import { ManagerWorkflowSection } from './components/ManagerWorkflowSection';
import { ApprovalsSection } from './components/ApprovalsSection';
import { TimelineSection } from './components/TimelineSection';

interface SearchCandidate {
  key: string;
  articleNumber: string;
  brand: string | null;
  name: string;
  category: string;
  localRemainder: number | null;
  price: number | null;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'default';
  localPart: Part | null;
  matchedLocalPart: Part | null;
  umapiArticleId: number | null;
  sourceType: 'LOCAL' | 'EXTERNAL';
  canAddAsLocal: boolean;
  canAddAsRequested: boolean;
}

export const OrderDetailsPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const navigate = useNavigate();
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [parts, setParts] = useState<OrderPartItem[]>([]);
  const [overviewItems, setOverviewItems] = useState<OrderPartsOverviewItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequestDTO[]>([]);
  const [timeline, setTimeline] = useState<OrderTimelineEntryResponseDTO[]>([]);
  const [serviceCatalogItems, setServiceCatalogItems] = useState<ServiceCatalogItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [mechanicDraftError, setMechanicDraftError] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [statusDraft, setStatusDraft] = useState<OrderStatus>('NEW');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAvailabilitySearchItem | null>(null);
  const [laborTotal, setLaborTotal] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQuantity, setSearchQuantity] = useState('1');
  const [vehicleScopedResults, setVehicleScopedResults] = useState<VehicleScopedPartSearchItem[]>([]);
  const [catalogLinked, setCatalogLinked] = useState(true);
  const [catalogWarning, setCatalogWarning] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState('0');
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedRequestedItem, setSelectedRequestedItem] = useState<AggregatedOrderPartsItem | null>(null);
  const [quotes, setQuotes] = useState<OrderRequestedPartQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState('0');
  const [salePrice, setSalePrice] = useState('');
  const [clientComment, setClientComment] = useState('');
  const [receivePartId, setReceivePartId] = useState('');
  const [receiveBrand, setReceiveBrand] = useState('');
  const [receiveName, setReceiveName] = useState('');
  const [receiveQuantity, setReceiveQuantity] = useState('1');
  const [receiveSalePrice, setReceiveSalePrice] = useState('');
  const [customerContactChannel, setCustomerContactChannel] = useState('WEB');
  const [mechanicDraft, setMechanicDraft] = useState<MechanicWorkDraftViewModel>({
    serviceCatalogItemId: null,
    approvalScenario: 'LABOR',
    title: '',
    description: '',
    laborAmount: '',
    partsAmount: '',
    requestedPartArticleNumber: '',
    requestedPartBrand: '',
    requestedPartName: '',
    requestedPartQuantity: '1',
    requiresOwnerApproval: true
  });

  const canManage = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC']);
  const canAssignEmployee = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER']);
  const canUpdateEstimate = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'MECHANIC']);
  const canEditDiscount = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER']);
  const canManageSearch = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'MECHANIC']);
  const canManageProcurement = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER']);
  const canSpendLoyalty = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST']);
  const canUseMechanicWorkspace = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'MECHANIC']);
  const canApproveRequests = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER']);

  const uploadedBy = useMemo(() => currentUser?.email ?? undefined, [currentUser]);
  const aggregatedOverview = useMemo(() => aggregateOverviewItems(overviewItems), [overviewItems]);
  const primaryRole = currentUser?.roles?.[0] ?? 'ADMIN';
  const financialCapabilities = useMemo(() => getFinancialCapabilities(primaryRole, { loyaltyEnabled: true, loyaltyVisible: true }), [primaryRole]);
  const sectionPolicies = useMemo(() => getOrderDetailSectionsForRole(primaryRole, { crmStatus: order?.crmStatus ?? null, loyaltyEnabled: true, loyaltyVisible: true }), [primaryRole, order?.crmStatus]);
  const visibleSections = useMemo(() => new Set(sectionPolicies.filter((section) => section.visible).map((section) => section.key)), [sectionPolicies]);
  const allowedStatusTargets = useMemo(() => getAllowedOrderStatusTargets(primaryRole, order?.crmStatus ?? order?.status ?? null), [primaryRole, order?.crmStatus, order?.status]);

  const buildCandidateStatus = (articleNumber: string, hasLocal: boolean) => {
    const overviewMatch = aggregatedOverview.find((item) => item.articleNumber.toUpperCase() === articleNumber.toUpperCase());
    if (overviewMatch?.displayStatus === 'IN_TRANSIT') {
      return { label: 'В пути', tone: 'warning' as const };
    }
    if (hasLocal || overviewMatch?.displayStatus === 'IN_STOCK') {
      return { label: 'На складе', tone: 'success' as const };
    }
    return { label: 'Нет на складе', tone: 'default' as const };
  };

  const searchCandidates = useMemo<SearchCandidate[]>(() => {
    return vehicleScopedResults.map((item, index) => {
      const matchedLocalPart = item.matchedLocalPart ?? null;
      const status = buildCandidateStatus(item.articleNumber, Boolean(item.availableLocally));
      return {
        key: `${item.articleNumber}-${index}`,
        articleNumber: item.articleNumber,
        brand: item.brand ?? matchedLocalPart?.brand ?? null,
        name: item.name,
        category: item.productGroupName ?? '—',
        localRemainder: matchedLocalPart?.availableQuantity ?? null,
        price: matchedLocalPart?.cost ?? null,
        statusLabel: status.label,
        statusTone: status.tone,
        localPart: matchedLocalPart,
        matchedLocalPart,
        umapiArticleId: item.umapiArticleId ?? null,
        sourceType: matchedLocalPart ? 'LOCAL' : 'EXTERNAL',
        canAddAsLocal: Boolean(item.canAddAsLocal),
        canAddAsRequested: Boolean(item.canAddAsRequested)
      };
    });
  }, [aggregatedOverview, vehicleScopedResults]);

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    setPartsError(null);
    setFilesError(null);
    setLoyaltyError(null);
    try {
      const orderData = await ordersApi.getById(orderId);
      setOrder(orderData);
      setStatusDraft(orderData.status);
      setEmployeeId(orderData.employeeId ? String(orderData.employeeId) : '');
      setLaborTotal(orderData.laborTotal ? String(orderData.laborTotal) : '0');
      setDiscountAmount(orderData.discountAmount ? String(orderData.discountAmount) : '0');
      const approvalsPromise = orderApprovalApi.listByOrderId(Number(orderId));
      const timelinePromise = orderTimelineApi.getByOrderId(Number(orderId));
      const servicesPromise = serviceCatalogApi.getServices({ activeOnly: true });
      const partsPromise = ordersApi.getParts(Number(orderId));
      const overviewPromise = orderRequestedPartsApi.getOverview(Number(orderId));
      const filesPromise = filesApi.listByOwner('ORDER', orderId);
      const loyaltyPromise = canSpendLoyalty ? loyaltyApi.getAccountByCustomerId(orderData.customerId) : Promise.resolve(null);

      const [approvalsResult, timelineResult, servicesResult, partsResult, overviewResult, filesResult, loyaltyResult] = await Promise.allSettled([
        approvalsPromise,
        timelinePromise,
        servicesPromise,
        partsPromise,
        overviewPromise,
        filesPromise,
        loyaltyPromise
      ]);
      setApprovals(approvalsResult.status === 'fulfilled' ? approvalsResult.value : []);
      setTimeline(timelineResult.status === 'fulfilled' ? timelineResult.value : []);
      setServiceCatalogItems(servicesResult.status === 'fulfilled' ? servicesResult.value : []);

      if (partsResult.status === 'fulfilled') {
        setParts(partsResult.value);
      setCatalogWarning(null);
      } else {
        setParts([]);
      }

      if (overviewResult.status === 'fulfilled') {
        setOverviewItems(overviewResult.value.items);
      } else {
        setOverviewItems([]);
        setPartsError(overviewResult.reason?.response?.data?.message ?? 'Не удалось загрузить overview деталей заказа.');
      }

      if (filesResult.status === 'fulfilled') {
        setFiles(filesResult.value.items);
      } else {
        setFiles([]);
        setFilesError(filesResult.reason?.response?.data?.message ?? 'Не удалось загрузить файлы заказа.');
      }

      if (loyaltyResult.status === 'fulfilled') {
        setLoyalty(loyaltyResult.value);
      } else {
        setLoyalty(null);
        setLoyaltyError(loyaltyResult.reason?.response?.data?.message ?? 'Не удалось загрузить loyalty клиента.');
      }
    } catch (requestError: any) {
      setOrder(null);
      setSelectedEmployee(null);
      setApprovals([]);
      setTimeline([]);
      setServiceCatalogItems([]);
      setError(requestError?.response?.data?.message ?? 'Не удалось загрузить карточку заказа.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, [orderId]);

  const autoTransitionOrderStatus = async (targetStatus: string) => {
    if (!order) return;
    if (!allowedStatusTargets.includes(targetStatus as any)) return;
    if ((order.crmStatus ?? order.status) === targetStatus) return;
    await ordersApi.updateStatus(order.id, targetStatus as any);
  };

  const wrapAction = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
      await loadPage();
    } catch (requestError: any) {
      setActionError(requestError?.response?.data?.message ?? 'Операция не выполнена.');
    }
  };

  const submitManagerApprovalDecision = async (requestId: number, decision: 'approve' | 'reject') => {
    if (!order) return;

    await wrapAction(async () => {
      if (decision === 'approve') {
        await orderApprovalApi.approve(order.id, requestId, { decisionToken: approvals.find((item) => item.requestId === requestId)?.requestToken ?? '', comment: approvalComment || undefined });
      } else {
        await orderApprovalApi.reject(order.id, requestId, { decisionToken: approvals.find((item) => item.requestId === requestId)?.requestToken ?? '', comment: approvalComment || undefined });
      }
      setApprovalComment('');
    });
  };

  const submitMechanicWorkRequest = async () => {
    if (!order) return;

    const title = mechanicDraft.title.trim();
    const description = mechanicDraft.description?.trim() || undefined;
    const laborAmount = mechanicDraft.laborAmount?.trim() || '';
    const partsAmount = mechanicDraft.partsAmount?.trim() || '';
    const partArticleNumber = mechanicDraft.requestedPartArticleNumber?.trim() || '';
    const partBrand = mechanicDraft.requestedPartBrand?.trim() || undefined;
    const partName = mechanicDraft.requestedPartName?.trim() || '';
    const partQuantity = Number(mechanicDraft.requestedPartQuantity?.trim() || '0');

    if (!title) {
      setMechanicDraftError('Укажи заголовок согласования.');
      return;
    }

    if (mechanicDraft.approvalScenario === 'LABOR') {
      if (!laborAmount || Number(laborAmount) < 0) {
        setMechanicDraftError('Для сценария «Работа» укажи корректную сумму работ.');
        return;
      }
    }

    if (mechanicDraft.approvalScenario === 'PART') {
      if (!partsAmount || Number(partsAmount) < 0) {
        setMechanicDraftError('Для сценария «Деталь» укажи корректную сумму деталей.');
        return;
      }
      if (!partArticleNumber || !partName || partQuantity < 1) {
        setMechanicDraftError('Для сценария «Деталь» заполни артикул, название и количество детали.');
        return;
      }
    }

    if (mechanicDraft.approvalScenario === 'LABOR_AND_PART') {
      if (!laborAmount || Number(laborAmount) < 0 || !partsAmount || Number(partsAmount) < 0) {
        setMechanicDraftError('Для сценария «Работа + деталь» укажи корректные суммы работ и деталей.');
        return;
      }
      if (!partArticleNumber || !partName || partQuantity < 1) {
        setMechanicDraftError('Для сценария «Работа + деталь» заполни артикул, название и количество детали.');
        return;
      }
    }

    setMechanicDraftError(null);

    await wrapAction(async () => {
      await orderApprovalApi.create(order.id, {
        title,
        description,
        laborAmount: mechanicDraft.approvalScenario === 'PART' ? '0' : laborAmount,
        partsAmount: mechanicDraft.approvalScenario === 'LABOR' ? '0' : partsAmount,
        requiresApproval: mechanicDraft.requiresOwnerApproval,
        customerContactChannel,
        requestedPart: mechanicDraft.approvalScenario === 'LABOR' ? undefined : {
          articleNumber: partArticleNumber,
          brand: partBrand,
          name: partName,
          quantity: partQuantity
        }
      });
      await autoTransitionOrderStatus('WAITING_FOR_OWNER_APPROVAL');
      setMechanicDraft({
        serviceCatalogItemId: null,
        approvalScenario: 'LABOR',
        title: '',
        description: '',
        laborAmount: '',
        partsAmount: '',
        requestedPartArticleNumber: '',
        requestedPartBrand: '',
        requestedPartName: '',
        requestedPartQuantity: '1',
        requiresOwnerApproval: order.requiresOwnerApprovalForEveryExtraWork ?? true
      });
    });
  };

  const searchParts = async () => {
    const normalized = searchQuery.trim();
    if (!normalized) {
      setSearchError(null);
      setCatalogWarning(null);
      setVehicleScopedResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setCatalogWarning(null);
    try {
      const data = await partsApi.searchByOrderVehicleName(Number(orderId), {
        query: normalized,
        availableOnly: false,
        limit: 20,
        offset: 0
      });
      setCatalogLinked(data.catalogLinked);
      setVehicleScopedResults(data.items);
      if (!data.catalogLinked) {
        setCatalogWarning('Для этой машины не выбрана точная модификация каталога. Сначала привяжите автомобиль к каталогу.');
      } else if (data.matchedProductGroups.length > 0 && data.items.length === 0) {
        setCatalogWarning('Категории найдены, но конкретные детали не вернулись.');
      }
    } catch (requestError: any) {
      setVehicleScopedResults([]);
      const message = requestError?.response?.data?.message ?? 'Не удалось выполнить поиск детали.';
      if (String(message).toLowerCase().includes('catalog modification')) {
        setCatalogLinked(false);
        setCatalogWarning('Для этой машины не выбрана точная модификация каталога. Сначала привяжите автомобиль к каталогу.');
      } else {
        setSearchError(message);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const onAddCandidate = async (candidate: SearchCandidate) => {
    if (!order) return;
    const quantity = Number(searchQuantity);
    if (quantity < 1) {
      setActionError('Количество должно быть больше нуля.');
      return;
    }

    const existingLocal = parts.find((item) => item.articleNumber?.toUpperCase() === candidate.articleNumber.toUpperCase());

    await wrapAction(async () => {
      if (candidate.canAddAsLocal && candidate.localPart) {
        if (existingLocal) {
          await ordersApi.updatePart(order.id, existingLocal.id, existingLocal.quantity + quantity);
        } else {
          await ordersApi.addPart(order.id, candidate.localPart.id, quantity);
        }
        return;
      }

      if (!candidate.canAddAsRequested) {
        throw new Error('Эта деталь сейчас нельзя добавить под заказ.');
      }

      await orderRequestedPartsApi.create(order.id, {
        articleNumber: candidate.articleNumber,
        brand: candidate.brand,
        name: candidate.name,
        umapiArticleId: candidate.umapiArticleId,
        matchedLocalPartId: candidate.matchedLocalPart?.id ?? null,
        quantity
      });
    });
  };

  const openQuotesDialog = async (item: AggregatedOrderPartsItem) => {
    if (!order || item.requestedPartIds.length === 0) return;
    setQuotesOpen(true);
    setSelectedRequestedItem(item);
    setQuotes([]);
    setQuotesLoading(true);
    setSelectedQuoteIndex('0');
    setSalePrice('');
    setClientComment(`Order for work order #${order.id}`);
    try {
      const data = await orderRequestedPartsApi.getQuotes(order.id, item.requestedPartIds[0]);
      setQuotes(data.quotes);
      setSalePrice(data.quotes[0]?.recommendedSalePrice ? String(data.quotes[0].recommendedSalePrice) : '');
    } catch (requestError: any) {
      setActionError(requestError?.response?.data?.message ?? 'Не удалось получить предложения поставщиков.');
      setQuotesOpen(false);
    } finally {
      setQuotesLoading(false);
    }
  };

  const submitQuoteOrder = async () => {
    if (!order || !selectedRequestedItem) return;
    const quote = quotes[Number(selectedQuoteIndex)];
    if (!quote) return;
    await wrapAction(async () => {
      await orderRequestedPartsApi.order(order.id, selectedRequestedItem.requestedPartIds[0], {
        quote: {
          positionSignature: quote.positionSignature ?? null,
          articleNumber: quote.articleNumber,
          brand: quote.brand,
          name: quote.name,
          purchasePrice: quote.purchasePrice,
          deliveryDaysMin: quote.deliveryDaysMin ?? null,
          deliveryDaysMax: quote.deliveryDaysMax ?? null,
          minOrderQuantity: quote.minOrderQuantity ?? null,
          quantityRaw: quote.quantityRaw ?? null
        },
        salePrice: Number(salePrice),
        createExternalOrder: true,
        clientComment: clientComment || undefined
      });
      await autoTransitionOrderStatus('WAITING_FOR_PART');
    });
    setQuotesOpen(false);
  };

  const openReceiveDialog = (item: AggregatedOrderPartsItem) => {
    setSelectedRequestedItem(item);
    setReceiveOpen(true);
    setReceivePartId(item.localPartId ? String(item.localPartId) : '');
    setReceiveBrand(item.brand ?? '');
    setReceiveName(item.name);
    setReceiveQuantity(String(item.quantity));
    setReceiveSalePrice(item.unitPrice != null ? String(item.unitPrice) : '');
  };

  const submitReceive = async () => {
    if (!order || !selectedRequestedItem) return;
    await wrapAction(async () => {
      await orderRequestedPartsApi.receive(order.id, selectedRequestedItem.requestedPartIds[0], {
        targetPartId: receivePartId ? Number(receivePartId) : null,
        brand: receivePartId ? undefined : receiveBrand,
        name: receivePartId ? undefined : receiveName,
        receivedQuantity: Number(receiveQuantity),
        salePrice: receiveSalePrice ? Number(receiveSalePrice) : null
      });
    });
    setReceiveOpen(false);
  };

  const onUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await wrapAction(async () => {
      await filesApi.upload({
        category: 'ORDER_DOCUMENT',
        ownerType: 'ORDER',
        ownerId: orderId,
        uploadedBy,
        file
      });
    });
    event.target.value = '';
  };

  return (
    <OrderDetailsView
      orderId={orderId}
      order={order}
      loading={loading}
      error={error}
      onRetry={() => void loadPage()}
      onBack={() => navigate(-1)}
      summarySection={order ? <OrderSummarySection order={order} /> : null}
      financeSection={order && visibleSections.has('financialSummary') ? <OrderFinanceSection order={order} /> : undefined}
      dialogs={<>
      <Dialog open={quotesOpen} onClose={() => setQuotesOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Предложения поставщиков для детали {selectedRequestedItem?.articleNumber}</DialogTitle>
        <DialogContent>
          {quotesLoading ? <LoadingTable /> : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {quotes.length === 0 ? <EmptyState title="Предложения не найдены" description="Попробуй повторить запрос позже." /> : (
                <>
                  <TextField select label="Выбранное предложение" value={selectedQuoteIndex} onChange={(event) => {
                    setSelectedQuoteIndex(event.target.value);
                    const nextQuote = quotes[Number(event.target.value)];
                    setSalePrice(nextQuote?.recommendedSalePrice ? String(nextQuote.recommendedSalePrice) : salePrice);
                  }}>
                    {quotes.map((quote, index) => (
                      <MenuItem key={`${quote.provider}-${quote.articleNumber}-${index}`} value={String(index)}>
                        {`${quote.provider} · ${quote.brand ?? '—'} ${quote.articleNumber} · ${formatMoney(String(quote.purchasePrice))} · ${quote.deliveryDaysMin ?? '—'}-${quote.deliveryDaysMax ?? '—'} дн.`}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField label="Цена продажи" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} />
                  <TextField label="Комментарий" value={clientComment} onChange={(event) => setClientComment(event.target.value)} />
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuotesOpen(false)}>Закрыть</Button>
          <Button variant="contained" onClick={() => void submitQuoteOrder()} disabled={quotesLoading || quotes.length === 0 || !salePrice}>Заказать</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={receiveOpen} onClose={() => setReceiveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Принять на склад {selectedRequestedItem?.articleNumber}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="ID складской детали (если уже есть)" value={receivePartId} onChange={(event) => setReceivePartId(event.target.value)} />
            {!receivePartId && <TextField label="Бренд для новой детали" value={receiveBrand} onChange={(event) => setReceiveBrand(event.target.value)} />}
            {!receivePartId && <TextField label="Название для новой детали" value={receiveName} onChange={(event) => setReceiveName(event.target.value)} />}
            <TextField label="Полученное количество" value={receiveQuantity} onChange={(event) => setReceiveQuantity(event.target.value)} />
            <TextField label="Цена продажи" value={receiveSalePrice} onChange={(event) => setReceiveSalePrice(event.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={() => void submitReceive()} disabled={!receiveQuantity}>Принять</Button>
        </DialogActions>
      </Dialog>
      </>}
    >
      {order && (
        <>
          {canManage && (
            <Grid size={{ xs: 12, lg: 6 }}>
              <SectionCard title="Операции по заказу">
                <Stack spacing={2}>
                  {actionError && <Alert severity="error">{actionError}</Alert>}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ width: '100%' }}>
                    <TextField select label="Статус" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as OrderStatus)} sx={{ minWidth: { xs: '100%', sm: 220 }, maxWidth: { xs: '100%', sm: 280 } }}>
                      {allowedStatusTargets.map((status) => <MenuItem key={status} value={status}>{getOrderStatusLabel(status)}</MenuItem>)}
                    </TextField>
                    <Button variant="contained" sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' }, whiteSpace: 'nowrap' }} onClick={() => void wrapAction(async () => setOrder(await ordersApi.updateStatus(order.id, statusDraft)))}>
                      Обновить статус
                    </Button>
                  </Stack>

                  {canAssignEmployee && (
                    <>
                      <EmployeeAvailabilityLookupField
                        label="Сотрудник для назначения"
                        value={selectedEmployee}
                        onChange={(employee) => {
                          setSelectedEmployee(employee);
                          setEmployeeId(employee ? String(employee.id) : '');
                        }}
                        plannedVisitAt={order.plannedVisitAt ?? null}
                        slotMinutes={order.plannedSlotMinutes ?? null}
                        roles={['MECHANIC', 'MANAGER']}
                        helperText="Показываются сотрудники, свободные на текущий слот заказа."
                      />
                      <Button variant="outlined" onClick={() => void wrapAction(async () => setOrder(await ordersApi.assignEmployee(order.id, Number(employeeId))))} disabled={!employeeId}>Назначить сотрудника</Button>
                    </>
                  )}

                  {canUpdateEstimate && (
                    <>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField fullWidth label="Стоимость работ" value={laborTotal} onChange={(event) => setLaborTotal(event.target.value)} />
                        {canEditDiscount && <TextField fullWidth label="Скидка" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />}
                      </Stack>
                      <Button variant="outlined" onClick={() => void wrapAction(async () => setOrder(await ordersApi.updateEstimate(order.id, Number(laborTotal), canEditDiscount ? Number(discountAmount) : Number(order.discountAmount ?? 0))))}>
                        Обновить смету
                      </Button>
                    </>
                  )}
                </Stack>
              </SectionCard>
            </Grid>
          )}

          {visibleSections.has('loyalty') && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard title="Loyalty">
              <Stack spacing={2}>
                {loyaltyError && <Alert severity="warning">{loyaltyError}</Alert>}
                <Typography>Баланс клиента: {loyalty?.pointsBalance ?? '—'} баллов</Typography>
                <Typography>Списано в заказе: {order.loyaltyPointsSpent ?? 0} баллов</Typography>
                {canSpendLoyalty && (
                  <>
                    <TextField label="Списать баллы" value={loyaltyPoints} onChange={(event) => setLoyaltyPoints(event.target.value)} />
                    <Stack direction="row" spacing={2}>
                      <Button variant="contained" onClick={() => void wrapAction(async () => setOrder(await ordersApi.spendLoyalty(order.id, Number(loyaltyPoints))))}>Применить</Button>
                      <Button variant="text" onClick={() => void wrapAction(async () => setOrder(await ordersApi.removeLoyalty(order.id)))}>Снять списание</Button>
                    </Stack>
                  </>
                )}
              </Stack>
            </SectionCard>
          </Grid>
          )}

          {(primaryRole === 'MANAGER' || primaryRole === 'ADMIN') && (
          <Grid size={12}>
            <ManagerWorkflowSection
              order={order}
              serviceLines={order.serviceLines ?? []}
              approvals={approvals}
              employeeId={employeeId}
              laborTotal={laborTotal}
              discountAmount={discountAmount}
              canAssignEmployee={canAssignEmployee}
              canEditDiscount={canEditDiscount}
              canUpdateEstimate={canUpdateEstimate}
              selectedEmployee={selectedEmployee}
              actionError={actionError}
              onEmployeeIdChange={setEmployeeId}
              onSelectedEmployeeChange={(employee) => {
                setSelectedEmployee(employee);
                setEmployeeId(employee ? String(employee.id) : '');
              }}
              onAssignEmployee={() => void wrapAction(async () => setOrder(await ordersApi.assignEmployee(order.id, Number(employeeId))))}
              onLaborTotalChange={setLaborTotal}
              onDiscountAmountChange={setDiscountAmount}
              onUpdateEstimate={() => void wrapAction(async () => setOrder(await ordersApi.updateEstimate(order.id, Number(laborTotal), canEditDiscount ? Number(discountAmount) : Number(order.discountAmount ?? 0))))}
              approvalComment={approvalComment}
              onApprovalCommentChange={setApprovalComment}
              onApprove={(requestId) => void submitManagerApprovalDecision(requestId, 'approve')}
              onReject={(requestId) => void submitManagerApprovalDecision(requestId, 'reject')}
            />
          </Grid>
          )}

          {visibleSections.has('mechanicWorkspace') && canUseMechanicWorkspace && (
          <Grid size={12}>
            <MechanicWorkspaceSection
              serviceLines={order.serviceLines ?? []}
              approvals={approvals}
              serviceCatalogItems={serviceCatalogItems}
              loadingCatalog={false}
              draft={mechanicDraft}
              customerContactChannel={customerContactChannel}
              draftError={mechanicDraftError}
              canEdit={primaryRole === 'MECHANIC' || primaryRole === 'ADMIN'}
              onDraftChange={(patch) => setMechanicDraft((current) => ({ ...current, ...patch }))}
              onContactChannelChange={setCustomerContactChannel}
              onSubmit={() => void submitMechanicWorkRequest()}
            />
          </Grid>
          )}

          {visibleSections.has('partsWorkspace') && (
          <Grid size={12}>
            <SectionCard title={primaryRole === 'MECHANIC' ? 'Запчасти по заказу' : 'Запчасти заказа'}>
              <Stack spacing={2}>
                {partsError && <Alert severity="warning">{partsError}</Alert>}
                {canManageSearch && (
                  <SectionCard title="Поиск и добавление детали">
                    <Stack spacing={2}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField fullWidth label="Поиск детали по названию" helperText="Поиск идет в контексте конкретной машины заказа" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                        <TextField sx={{ minWidth: { xs: '100%', md: 160 } }} label="Количество" value={searchQuantity} onChange={(event) => setSearchQuantity(event.target.value)} />
                        <Button variant="contained" onClick={() => void searchParts()} disabled={searchLoading || !searchQuery.trim()}>
                          {searchLoading ? 'Поиск...' : 'Найти'}
                        </Button>
                      </Stack>
                      {!catalogLinked && catalogWarning && <Alert severity="info">{catalogWarning}</Alert>}
                      {catalogLinked && catalogWarning && <Alert severity="info">{catalogWarning}</Alert>}
                      {searchError && <Alert severity="warning">{searchError}</Alert>}
                      {searchCandidates.length > 0 && (
                        <TableContainer component={Paper} variant="outlined">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Категория</TableCell>
                                <TableCell>Артикул</TableCell>
                                <TableCell>Бренд</TableCell>
                                <TableCell>Название</TableCell>
                                <TableCell>Локальный остаток</TableCell>
                                <TableCell>Цена</TableCell>
                                <TableCell align="right">Действие</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {searchCandidates.map((candidate) => (
                                <TableRow key={candidate.key} hover>
                                  <TableCell>{candidate.category}</TableCell>
                                  <TableCell>{candidate.articleNumber}</TableCell>
                                  <TableCell>{candidate.brand ?? '—'}</TableCell>
                                  <TableCell>{candidate.name}</TableCell>
                                  <TableCell>{candidate.localRemainder ?? '—'}</TableCell>
                                  <TableCell>{candidate.price != null ? formatMoney(String(candidate.price)) : '—'}</TableCell>
                                  <TableCell align="right">
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
                                      <Chip label={candidate.statusLabel} color={candidate.statusTone} size="small" />
                                      {candidate.canAddAsLocal && <Button variant="contained" onClick={() => void onAddCandidate(candidate)}>Добавить со склада</Button>}
                                      {!candidate.canAddAsLocal && candidate.canAddAsRequested && <Button variant="outlined" onClick={() => void onAddCandidate(candidate)}>Добавить под заказ</Button>}
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                      {!searchLoading && searchQuery.trim() && searchCandidates.length === 0 && !searchError && !catalogWarning && (
                        <EmptyState title="Ничего не найдено" description="По вашему запросу ничего не найдено для этой модификации автомобиля." />
                      )}
                    </Stack>
                  </SectionCard>
                )}

                {aggregatedOverview.length === 0 ? (
                  <EmptyState title="Запчастей пока нет" description="Добавь первую деталь в заказ через поиск выше." />
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Артикул</TableCell>
                          <TableCell>Бренд</TableCell>
                          <TableCell>Название</TableCell>
                          <TableCell>Количество</TableCell>
                          <TableCell>Статус</TableCell>
                          {canManageProcurement && <TableCell>Цена</TableCell>}
                          {canManageProcurement && <TableCell>Сумма</TableCell>}
                          <TableCell align="right">Действие</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {aggregatedOverview.map((item) => (
                          <TableRow key={item.key} hover>
                            <TableCell>{item.articleNumber}</TableCell>
                            <TableCell>{item.brand ?? '—'}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Chip label={item.displayStatusLabel} color={item.displayStatus === 'IN_STOCK' ? 'success' : item.displayStatus === 'IN_TRANSIT' ? 'warning' : 'default'} size="small" />
                            </TableCell>
                            {canManageProcurement && <TableCell>{item.unitPrice != null ? formatMoney(String(item.unitPrice)) : '—'}</TableCell>}
                            {canManageProcurement && <TableCell>{item.lineTotal != null ? formatMoney(String(item.lineTotal)) : '—'}</TableCell>}
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {canManageProcurement && item.itemType !== 'LOCAL' && item.displayStatus === 'OUT_OF_STOCK' && (
                                  <Button size="small" startIcon={<ShoppingCartCheckoutRoundedIcon />} onClick={() => void openQuotesDialog(item)}>
                                    Поставщики
                                  </Button>
                                )}
                                {canManageProcurement && item.itemType !== 'LOCAL' && item.displayStatus === 'IN_TRANSIT' && (
                                  <Button size="small" startIcon={<LocalShippingRoundedIcon />} onClick={() => openReceiveDialog(item)}>
                                    Принять
                                  </Button>
                                )}
                                {canManageProcurement && item.itemType === 'LOCAL' && (
                                  <Button color="error" size="small" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => {
                                    const localItem = item.overviewItems.find((overviewItem) => overviewItem.itemType === 'LOCAL');
                                    if (localItem) void wrapAction(async () => await ordersApi.deletePart(order.id, localItem.id));
                                  }}>
                                    Удалить
                                  </Button>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </SectionCard>
          </Grid>
          )}

          {visibleSections.has('approvals') && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <OrderSectionShell title="Согласования">
              <ApprovalsSection
                approvals={approvals}
                canManageApprovalDecisions={canApproveRequests}
                approvalComment={approvalComment}
                onApprovalCommentChange={setApprovalComment}
                onApprove={(requestId) => void submitManagerApprovalDecision(requestId, 'approve')}
                onReject={(requestId) => void submitManagerApprovalDecision(requestId, 'reject')}
              />
            </OrderSectionShell>
          </Grid>
          )}

          {visibleSections.has('timeline') && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <OrderSectionShell title="История заказа">
              <TimelineSection timeline={timeline} />
            </OrderSectionShell>
          </Grid>
          )}

          {visibleSections.has('files') && (
          <Grid size={12}>
            <OrderFilesSection
              files={files}
              filesError={filesError}
              onUploadFile={onUploadFile}
              onDeleteFile={(fileId) => void wrapAction(async () => await filesApi.delete(fileId))}
            />
          </Grid>
          )}
        </>
      )}
    </OrderDetailsView>
  );
};
