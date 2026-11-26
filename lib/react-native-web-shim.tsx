'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';

type EstiloRN = Record<string, unknown>;
export type StyleProp<T = EstiloRN> =
  | T
  | EstiloRN
  | null
  | undefined
  | false
  | Array<StyleProp<T>>;

const TextAncestorContext = createContext(false);

const PROPS_SEM_PX = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'opacity',
  'zIndex',
  'fontWeight',
  'lineHeight',
  'aspectRatio',
]);

function converterUnidade(chave: string, valor: unknown): unknown {
  if (typeof valor === 'number' && !PROPS_SEM_PX.has(chave)) {
    return `${valor}px`;
  }
  if (chave === 'lineHeight' && typeof valor === 'number') {
    return `${valor}px`;
  }
  return valor;
}

export function normalizarEstiloRN(estilo?: StyleProp): React.CSSProperties {
  const acumulado: Record<string, unknown> = {};

  function aplicar(item: StyleProp) {
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item)) {
      item.forEach(aplicar);
      return;
    }
    for (const [chave, valor] of Object.entries(item)) {
      if (valor === undefined || valor === null) continue;
      if (chave === 'paddingHorizontal') {
        acumulado.paddingLeft = converterUnidade('paddingLeft', valor);
        acumulado.paddingRight = converterUnidade('paddingRight', valor);
      } else if (chave === 'paddingVertical') {
        acumulado.paddingTop = converterUnidade('paddingTop', valor);
        acumulado.paddingBottom = converterUnidade('paddingBottom', valor);
      } else if (chave === 'marginHorizontal') {
        acumulado.marginLeft = converterUnidade('marginLeft', valor);
        acumulado.marginRight = converterUnidade('marginRight', valor);
      } else if (chave === 'marginVertical') {
        acumulado.marginTop = converterUnidade('marginTop', valor);
        acumulado.marginBottom = converterUnidade('marginBottom', valor);
      } else {
        acumulado[chave] = converterUnidade(chave, valor);
      }
    }
  }

  aplicar(estilo);

  if (acumulado.borderWidth && !acumulado.borderStyle) {
    acumulado.borderStyle = 'solid';
  }
  if (acumulado.borderTopWidth && !acumulado.borderTopStyle) {
    acumulado.borderTopStyle = 'solid';
  }
  if (acumulado.borderBottomWidth && !acumulado.borderBottomStyle) {
    acumulado.borderBottomStyle = 'solid';
  }
  if (acumulado.borderLeftWidth && !acumulado.borderLeftStyle) {
    acumulado.borderLeftStyle = 'solid';
  }
  if (acumulado.borderRightWidth && !acumulado.borderRightStyle) {
    acumulado.borderRightStyle = 'solid';
  }

  return acumulado as React.CSSProperties;
}

function renderizarInlineMarkdown(texto: string): React.ReactNode {
  // Divide por **negrito** ou *itálico*
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 800 }}>
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
      return <em key={i}>{p.slice(1, -1)}</em>;
    }
    return p;
  });
}

function renderizarMarkdownSimples(texto: string): React.ReactNode {
  if (!texto.includes('*') && !texto.includes('### ')) {
    return texto;
  }
  const linhas = texto.split('\n');
  return linhas.map((linha, idxLinha) => {
    const ehTitulo = linha.startsWith('### ');
    const conteudoLinha = ehTitulo ? linha.slice(4) : linha;
    return (
      <React.Fragment key={idxLinha}>
        {ehTitulo ? (
          <strong style={{ display: 'block', fontSize: '1.06em', marginBottom: '4px' }}>
            {renderizarInlineMarkdown(conteudoLinha)}
          </strong>
        ) : (
          renderizarInlineMarkdown(conteudoLinha)
        )}
        {idxLinha < linhas.length - 1 ? '\n' : null}
      </React.Fragment>
    );
  });
}

function processarChildrenTexto(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return renderizarMarkdownSimples(child);
    }
    return child;
  });
}

export function View({
  style,
  nativeID,
  children,
}: {
  style?: StyleProp;
  nativeID?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      id={nativeID}
      style={{
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        ...normalizarEstiloRN(style),
      }}
    >
      {children}
    </div>
  );
}

export function SafeAreaView({
  style,
  children,
}: {
  style?: StyleProp;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        ...normalizarEstiloRN(style),
      }}
    >
      {children}
    </div>
  );
}

export function Text({
  style,
  numberOfLines,
  children,
}: {
  style?: StyleProp;
  numberOfLines?: number;
  children?: React.ReactNode;
}) {
  const dentroDeTexto = useContext(TextAncestorContext);
  const estiloNormalizado = normalizarEstiloRN(style);
  const estiloTruncado: React.CSSProperties =
    numberOfLines === 1
      ? {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }
      : {
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        };

  const conteudoProcessado = processarChildrenTexto(children);

  if (dentroDeTexto) {
    return (
      <span style={{ ...estiloTruncado, ...estiloNormalizado }}>
        {conteudoProcessado}
      </span>
    );
  }

  return (
    <TextAncestorContext.Provider value={true}>
      <div
        style={{
          boxSizing: 'border-box',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          ...estiloTruncado,
          ...estiloNormalizado,
        }}
      >
        {conteudoProcessado}
      </div>
    </TextAncestorContext.Provider>
  );
}

export function TextInput({
  style,
  value,
  onChangeText,
  onSubmitEditing,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
}: {
  style?: StyleProp;
  value?: string;
  onChangeText?: (texto: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  placeholderTextColor?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: string;
  keyboardType?: string;
  multiline?: boolean;
}) {
  const estiloBase: React.CSSProperties = {
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    outline: 'none',
    width: '100%',
    ...normalizarEstiloRN(style),
  };

  if (multiline) {
    return (
      <textarea
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChangeText?.(e.target.value)}
        style={{
          resize: 'vertical',
          ...estiloBase,
        }}
      />
    );
  }

  const tipoHtml = secureTextEntry
    ? 'password'
    : keyboardType === 'email-address'
      ? 'email'
      : 'text';

  return (
    <input
      type={tipoHtml}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChangeText?.(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onSubmitEditing) {
          e.preventDefault();
          onSubmitEditing();
        }
      }}
      style={estiloBase}
    />
  );
}

export function TouchableOpacity({
  style,
  onPress,
  disabled,
  children,
}: {
  style?: StyleProp;
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled && onPress) onPress();
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        borderWidth: 0,
        borderStyle: 'none',
        backgroundColor: 'transparent',
        padding: 0,
        margin: 0,
        textAlign: 'left',
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        transition: 'transform 0.08s ease, background-color 0.12s ease',
        ...normalizarEstiloRN(style),
      }}
    >
      {children}
    </button>
  );
}

export function ScrollView({
  style,
  contentContainerStyle,
  horizontal,
  children,
}: {
  style?: StyleProp;
  contentContainerStyle?: StyleProp;
  horizontal?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qtdFilhos = React.Children.count(children);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || horizontal) return;
    const marcadorChat = el.querySelector('#fim-chat-mobile');
    if (marcadorChat) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [qtdFilhos, children, horizontal]);

  return (
    <div
      ref={containerRef}
      className="rn-scroll-view"
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        overflowX: horizontal ? 'auto' : 'hidden',
        overflowY: horizontal ? 'hidden' : 'auto',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
        ...(horizontal
          ? { flexShrink: 0, width: '100%', paddingBottom: '4px' }
          : { flex: 1, minHeight: 0, height: '100%' }),
        ...normalizarEstiloRN(style),
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: horizontal ? 'row' : 'column',
          boxSizing: 'border-box',
          ...(horizontal ? { alignItems: 'center' } : { width: '100%', flexShrink: 0 }),
          ...normalizarEstiloRN(contentContainerStyle),
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Image({
  source,
  style,
  resizeMode = 'contain',
  accessibilityLabel,
}: {
  source: { uri: string } | string;
  style?: StyleProp;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  accessibilityLabel?: string;
}) {
  const uri = typeof source === 'string' ? source : source.uri;
  const objectFit =
    resizeMode === 'cover' ? 'cover' : resizeMode === 'stretch' ? 'fill' : 'contain';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={uri}
      alt={accessibilityLabel ?? ''}
      loading="lazy"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit,
        boxSizing: 'border-box',
        ...normalizarEstiloRN(style),
      }}
    />
  );
}

export function Modal({
  visible,
  children,
}: {
  visible?: boolean;
  transparent?: boolean;
  animationType?: string;
  onRequestClose?: () => void;
  children?: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}

export function StatusBar(props: { barStyle?: string; backgroundColor?: string }) {
  void props;
  return null;
}

export const StyleSheet = {
  create<T extends Record<string, EstiloRN>>(estilos: T): T {
    return estilos;
  },
};

export const Linking = {
  async canOpenURL(url: string): Promise<boolean> {
    return Boolean(url);
  },
  async openURL(url: string): Promise<void> {
    if (typeof window !== 'undefined' && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },
};

export function registerRootComponent(componente: unknown): void {
  void componente;
}
