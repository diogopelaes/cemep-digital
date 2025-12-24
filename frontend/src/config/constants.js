import institutionalData from '../../../institutional_config.json';

/**
 * Configurações e constantes centralizadas do sistema CEMEP Digital
 * 
 * IMPORTANTE: Altere as configurações aqui para refletir em todo o sistema
 */

// Exporta o objeto completo para acesso a campos aninhados
export const INSTITUTIONAL_DATA = institutionalData

// URL do site (altere aqui quando mudar o domínio)
export const SITE_URL = import.meta.env.VITE_SITE_URL || institutionalData.system.site_url

// Nome do sistema
export const SYSTEM_NAME = institutionalData.system.name

// Nome da instituição
export const INSTITUTION_NAME = institutionalData.institution.name_official
export const INSTITUTION_FANTASY = institutionalData.institution.name_fantasy

// Logo do sistema (caminho relativo ao public)
export const LOGO_PATH = institutionalData.institution.logo.path_relative

// Contato
export const CONTACT_EMAIL = institutionalData.institution.contact.email
export const CONTACT_PHONE = institutionalData.institution.contact.phone
export const CONTACT_SITE = institutionalData.institution.contact.site

// Endereço
export const ADDRESS_CITY = institutionalData.institution.address.city
export const ADDRESS_STATE = institutionalData.institution.address.state
export const ADDRESS_FULL = `${institutionalData.institution.address.street}, ${institutionalData.institution.address.number} - ${institutionalData.institution.address.neighborhood}, ${institutionalData.institution.address.city} - ${institutionalData.institution.address.state}`

// Versão do sistema
export const VERSION = institutionalData.system.version

