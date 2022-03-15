import { useState } from 'react';
import { PaymentMethod } from '@prisma/client';
import { usePopupState, bindTrigger } from 'material-ui-popup-state/hooks';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { usePaymentMethods } from 'hooks/usePaymentMethods';
import { getChainById } from 'connectors';
import { Modal } from 'components/common/Modal';
import { CustomErcTokenForm } from 'components/common/form/CustomErcTokenForm';
import charmClient from 'charmClient';
import Legend from './Legend';
import Button from '../common/Button';

export default function PaymentMethodList ({ isAdmin = true }) {

  const [modalOpen, setModalOpen] = useState(false);

  const [paymentMethods, setPaymentMethods, refreshPaymentMethods] = usePaymentMethods();

  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);

  async function paymentMethodAdded (paymentMethod: Partial<PaymentMethod>) {
    setModalOpen(false);

  }

  async function deletePaymentMethod (methodId: string) {
    await charmClient.deletePaymentMethod(methodId);
    setPaymentMethodToDelete(null);
    refreshPaymentMethods();
  }

  console.log('Available payment methods', paymentMethods);

  return (
    <>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <CustomErcTokenForm onSubmit={paymentMethodAdded} />
      </Modal>

      <Modal
        open={paymentMethodToDelete !== null}
        onClose={() => {
          setPaymentMethodToDelete(null);
        }}
      >

        <Typography>
          <Box component='span' sx={{ pr: 1 }}>Are you sure you want to delete</Box>
          <Box component='span' sx={{ pr: 1 }}>{paymentMethodToDelete?.tokenSymbol}</Box>

        </Typography>

        <Box component='div' sx={{ columnSpacing: 2, mt: 3 }}>
          <Button
            color='error'
            sx={{ mr: 2, fontWeight: 'bold' }}
            onClick={() => {
              deletePaymentMethod(paymentMethodToDelete!.id);
            }}
          >
            {`Delete ${paymentMethodToDelete?.tokenSymbol}`}
          </Button>

          <Button color='secondary' onClick={() => setPaymentMethodToDelete(null)}>Cancel</Button>
        </Box>

      </Modal>

      <Legend>
        Payment Methods
        {isAdmin && (
        <Button
          onClick={() => setModalOpen(true)}
          variant='outlined'
          sx={{ float: 'right' }}
        >
          Add a payment method
        </Button>
        )}
      </Legend>

      <Box>
        {
          (Object.entries(paymentMethods).map(chain => {

            const chainDetails = getChainById(chain[0]);

            const chainPaymentMethods = chain[1];

            return (
              <Box key={chain[0]} sx={{ mb: 2 }}>
                <Typography variant='h2'>{chainDetails?.chainName}</Typography>

                {
                  chainPaymentMethods.map(paymentMethod => {
                    return (
                      <Box width='100%' sx={{ display: 'flex' }}>

                        <Box component='span' sx={{ pr: 1 }}>
                          {paymentMethod.tokenSymbol}
                        </Box>

                        {
                          paymentMethod.tokenLogo && (
                            <Box component='span'>

                              <img width='25x' height='25px' alt='Crypto logo' src={paymentMethod.tokenLogo} />
                            </Box>
                          )
                        }

                        {paymentMethod.contractAddress}
                        <DeleteIcon onClick={() => setPaymentMethodToDelete(paymentMethod)} sx={{ fill: 'red' }}></DeleteIcon>
                        ;
                      </Box>
                    );
                  })
                }

              </Box>
            );
          }))
        }
      </Box>
    </>
  );
}

