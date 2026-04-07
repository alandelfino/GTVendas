import React from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export interface ItemPedido {
  idExterno: string;
  nome: string;
  precoVendido: number;
  grade: { nome: string, quantidade: number }[];
}

export interface OrderDetail {
  idExterno: string;
  cadastradoEm: number;
  valorTotal: number;
  status: string;
  cliente: {
     idExterno: string;
     nome: string;
     fantasia: string;
     cnpj: string;
     cidade: string;
     uf: string;
     statusDescricao: string;
  };
  descontos?: { tipo: string, valor: number }[];
  itens: ItemPedido[];
}

interface OrderDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  order: OrderDetail | null;
  loading: boolean;
  theme: any;
  getStatusColor: (status: string) => string;
  formatCurrency: (cents: number) => string;
}

export default function OrderDetailSheet({
  visible,
  onClose,
  order,
  loading,
  theme,
  getStatusColor,
  formatCurrency
}: OrderDetailSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalBase, { backgroundColor: theme.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.separator }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: theme.text }]}>Detalhe do Pedido</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={{ color: theme.accent, fontWeight: '500', fontSize: 17 }}>OK</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.modalLoading}><ActivityIndicator color={theme.accent} size="large" /></View>
        ) : order && (
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            
            {/* 1. SEÇÃO CLIENTE (NO TOPO COM AVATAR) */}
            <View style={[styles.iosGroupedCard, { backgroundColor: theme.card, paddingVertical: 16 }]}>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.customerAvatar, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>
                      {order.cliente.fantasia.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.customerMain, { color: theme.text }]} numberOfLines={1}>
                      {order.cliente.fantasia}
                    </Text>
                    <Text style={[styles.customerSub, { color: theme.secondary }]}>
                      {order.cliente.nome}
                    </Text>
                  </View>
               </View>
               <View style={[styles.iosSeparator, { backgroundColor: theme.separator, marginVertical: 12 }]} />
               <Text style={[styles.customerDetail, { color: theme.secondary }]}>
                  CNPJ: {order.cliente.cnpj} • {order.cliente.cidade}, {order.cliente.uf}
               </Text>
            </View>

            {/* 2. RESUMO DO PEDIDO */}
            <View style={[styles.iosGroupedCard, { backgroundColor: theme.card }]}>
              <View style={styles.iosRow}>
                <Text style={[styles.iosLabel, { color: theme.secondary }]}>Pedido</Text>
                <Text style={[styles.iosHeroValue, { color: theme.text }]}>#{order.idExterno}</Text>
              </View>
              <View style={[styles.iosSeparator, { backgroundColor: theme.separator }]} />
              <View style={styles.iosRow}>
                <Text style={[styles.iosLabel, { color: theme.secondary }]}>Data do Pedido</Text>
                <Text style={[styles.iosValue, { color: theme.text }]}>
                  {new Date(order.cadastradoEm).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <View style={[styles.iosSeparator, { backgroundColor: theme.separator }]} />
              <View style={styles.iosRow}>
                <Text style={[styles.iosLabel, { color: theme.secondary }]}>Status Atual</Text>
                <View style={[styles.statusTag, { backgroundColor: getStatusColor(order.status) + '12' }]}>
                  <Text style={[styles.statusTagText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
                </View>
              </View>
            </View>

            {/* 3. ITENS DO PEDIDO (COM MAIS ESPAÇO) */}
            <Text style={styles.iosGroupLabel}>PRODUTOS DO PEDIDO</Text>
            <View style={[styles.iosGroupedCard, { backgroundColor: theme.card, paddingHorizontal: 0 }]}>
              {(Array.isArray(order.itens) ? order.itens : []).map((it: any, idx) => {
                const prodRef = it.produtoId || it.idExterno || it.id || 'S/ REF';
                const variations = Array.isArray(it.variacoes) ? it.variacoes : [];
                const totalQty = it.quantidade || (variations.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0)) || 0;

                return (
                  <View key={idx}>
                    <View style={styles.iosItemRowExpanded}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.iosItemName, { color: theme.text, fontSize: 16 }]}>
                          {it.descricao || it.nome}
                        </Text>
                        <Text style={[styles.iosItemRef, { color: theme.accent, marginTop: 2 }]}>
                          REF: {prodRef}
                        </Text>
                        
                        {/* Grades de Variações - Posicionada abaixo com respiro */}
                        {variations.length > 0 && (
                          <View style={{ marginTop: 12 }}>
                            <View style={styles.sizeWrap}>
                               {variations.map((v: any, vIdx: number) => (
                                 (v.amount > 0) && (
                                   <View key={vIdx} style={[styles.sizeBadge, { backgroundColor: theme.bg }]}>
                                     <Text style={[styles.sizeText, { color: theme.secondary }]}>{v.value}</Text>
                                     <View style={{ width: 1, height: 10, backgroundColor: theme.separator, marginHorizontal: 4 }} />
                                     <Text style={[styles.qtyText, { color: theme.text }]}>{v.amount}</Text>
                                   </View>
                                 )
                               ))}
                            </View>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', marginLeft: 16 }}>
                        <Text style={[styles.iosItemPrice, { color: theme.text, fontSize: 17 }]}>{totalQty} un</Text>
                        <Text style={[styles.iosItemPriceSub, { color: theme.secondary, marginTop: 4 }]}>
                          {formatCurrency(it.valorUnitario || it.precoVendido)} /un
                        </Text>
                      </View>
                    </View>
                    {idx < (order.itens || []).length - 1 && (
                      <View style={[styles.iosSeparator, { backgroundColor: theme.separator, marginLeft: 16 }]} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* 4. RESUMO FINANCEIRO (FINAL) */}
            <Text style={styles.iosGroupLabel}>VALORES TOTAIS</Text>
            <View style={[styles.iosGroupedCard, { backgroundColor: theme.card, marginBottom: 40 }]}>
              <View style={styles.iosRow}>
                <Text style={[styles.iosLabel, { color: theme.secondary }]}>Subtotal Bruto</Text>
                <Text style={[styles.iosValue, { color: theme.text }]}>{formatCurrency(order.valorTotal)}</Text>
              </View>
              
              {Array.isArray(order.descontos) && order.descontos.length > 0 && (
                <>
                  <View style={[styles.iosSeparator, { backgroundColor: theme.separator }]} />
                  {order.descontos.map((desc, dIdx) => (
                    <View key={dIdx} style={styles.iosRow}>
                       <Text style={[styles.iosLabel, { color: theme.secondary }]}>(-) Desconto {desc.tipo}</Text>
                       <Text style={[styles.iosValue, { color: theme.danger }]}>-{formatCurrency(desc.valor)}</Text>
                    </View>
                  ))}
                </>
              )}

              <View style={[styles.iosSeparator, { backgroundColor: theme.separator }]} />
              <View style={styles.iosRow}>
                <Text style={[styles.iosLabel, { color: theme.text, fontWeight: '700' }]}>Total Líquido</Text>
                <Text style={[styles.iosHeroValue, { color: theme.primary, fontSize: 22 }]}>
                  {formatCurrency(order.valorTotal - (Array.isArray(order.descontos) ? order.descontos.reduce((a, b) => a + b.valor, 0) : 0))}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBase: { flex: 1 },
  modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  modalHandle: { position: 'absolute', top: 8, width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC' },
  modalTitle: { fontSize: 17, fontWeight: '700', marginTop: 10 },
  modalClose: { position: 'absolute', right: 16, marginTop: 10 },
  modalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalScroll: { padding: 16, paddingBottom: 60 },
  iosGroupedCard: { borderRadius: 10, paddingHorizontal: 16, marginBottom: 24, overflow: 'hidden' },
  iosGroupLabel: { fontSize: 13, fontWeight: '400', color: '#8E8E93', marginLeft: 16, marginBottom: 8, textTransform: 'uppercase' },
  iosRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iosRowCol: { paddingVertical: 18 },
  iosLabel: { fontSize: 17, fontWeight: '400' },
  iosValue: { fontSize: 17, fontWeight: '400' },
  iosHeroValue: { fontSize: 18, fontWeight: '700' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusTagText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  iosSeparator: { height: StyleSheet.hairlineWidth },
  iosItemRow: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iosItemRowExpanded: { paddingVertical: 18, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' },
  iosItemName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  iosItemRef: { fontSize: 12, fontWeight: '700' },
  iosItemPrice: { fontSize: 15, fontWeight: '800' },
  iosItemPriceSub: { fontSize: 12, marginTop: 2 },
  gridSection: { marginTop: 8 },
  sizeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeBadge: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center' },
  sizeText: { fontSize: 12, fontWeight: '600' },
  qtyText: { fontSize: 12, fontWeight: '800' },
  customerAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  customerMain: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  customerSub: { fontSize: 14, marginBottom: 4 },
  customerDetail: { fontSize: 12, fontWeight: '500' }
});
