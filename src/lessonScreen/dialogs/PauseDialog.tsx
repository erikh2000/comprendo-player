import ModalDialog from "ui/dialog/ModalDialog";
import DialogFooter from "../../ui/dialog/DialogFooter";
import DialogButton from "../../ui/dialog/DialogButton";

type Props = {
  isOpen:boolean;
  onResume:() => void;
  onExit:() => void;
}

function PauseDialog(props:Props) {
  const { isOpen, onExit, onResume } = props;
  return <ModalDialog
    isOpen={isOpen}  
    title="Pausado" 
  >
    <DialogFooter>
      <DialogButton onClick={onResume} text='Reanudar' isPrimary={true}/>
      <DialogButton onClick={onExit} text='Salir'/>
    </DialogFooter>
  </ModalDialog>;
}

export default PauseDialog;